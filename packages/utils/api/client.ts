// API Client with automatic token attachment, retry logic, and network resilience

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number;
}

class ApiClient {
  private baseURL: string;
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheDuration: number = 30000; // 30 seconds cache for better performance
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // Start with 1 second
    maxDelay: 8000,  // Max 8 seconds between retries
  };
  private isOnline: boolean = true;

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Initializes the API client with the given base URL.
   * @param {string} baseURL - The base URL of the API.
   */
  /*******  5363a146-c879-41fa-8f9b-012217083ba8  *******/ constructor(
    baseURL: string
  ) {
    this.baseURL = baseURL;
    this.setupNetworkListeners();
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners() {
    if (typeof window === "undefined") return;

    // Initial check
    this.isOnline = navigator.onLine;

    window.addEventListener("online", () => {
      console.log("🌐 Network: Back online");
      this.isOnline = true;
      // Dispatch custom event for components
      window.dispatchEvent(new Event("network-online"));
    });

    window.addEventListener("offline", () => {
      console.log("📵 Network: Offline");
      this.isOnline = false;
      // Dispatch custom event for components
      window.dispatchEvent(new Event("network-offline"));
    });
  }

  /**
   * Check if device is online
   */
  private checkOnline(): boolean {
    if (typeof window === "undefined") return true;
    return navigator.onLine && this.isOnline;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(attemptNumber: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, attemptNumber),
      this.retryConfig.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.name === "AbortError") return true;
    if (error.message?.includes("timeout")) return true;
    if (error.message?.includes("network")) return true;
    if (error.message?.includes("Failed to fetch")) return true;

    // Server errors 5xx are retryable
    if (error.status >= 500 && error.status < 600) return true;

    // 408 Request Timeout is retryable
    if (error.status === 408) return true;

    // 429 Too Many Requests - should retry with backoff
    if (error.status === 429) return true;

    return false;
  }

  /**
   * Enhanced error message based on error type
   */
  private getErrorMessage(error: any, attemptNumber: number = 0): string {
    const isRetrying = attemptNumber > 0;
    const retryText = isRetrying ? ` (ការព្យាយាមលើកទី ${attemptNumber})` : "";

    if (!this.checkOnline()) {
      return "អ្នកមិនមានអ៊ីនធឺណិតទេ • No internet connection";
    }

    if (error.name === "AbortError" || error.message?.includes("timeout")) {
      return `ការតភ្ជាប់យឺត សូមរង់ចាំ${retryText} • Connection is slow, please wait${retryText}`;
    }

    if (error.status === 401) {
      return "សូមចូលប្រើប្រាស់ម្តងទៀត • Please login again";
    }

    if (error.status === 403) {
      return "អ្នកមិនមានសិទ្ធិចូលប្រើ • Access denied";
    }

    if (error.status === 404) {
      return "រកមិនឃើញទិន្នន័យ • Data not found";
    }

    if (error.status >= 500) {
      return `មានបញ្ហាខាងម៉ាស៊ីនមេ${retryText} • Server error${retryText}`;
    }

    if (error.message?.includes("Failed to fetch")) {
      return `មានបញ្ហាក្នុងការតភ្ជាប់${retryText} • Connection problem${retryText}`;
    }

    return error.message || `មានបញ្ហា${retryText} • Request failed${retryText}`;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  async get<T = any>(endpoint: string, useCache: boolean = false): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Check cache for auth endpoints to reduce duplicate requests
    if (useCache && endpoint === "/auth/me") {
      const cached = this.requestCache.get(endpoint);
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        console.log("✅ Using cached response for:", endpoint);
        return cached.data;
      }
    }

    // Check if online before making request
    if (!this.checkOnline()) {
      throw new Error("អ្នកមិនមានអ៊ីនធឺណិតទេ • No internet connection");
    }

    console.log("📤 GET:", url);

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      const headers = this.getHeaders();

      try {
        // Add timeout for better UX (20 seconds for GET)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(url, {
          method: "GET",
          headers,
          cache: "no-store",
          credentials: "include", // ✅ iOS 16 FIX: Required for PWA mode
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log("📥 Response status:", response.status);

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
          }));
          console.error("❌ GET Error:", error);
          const err: any = new Error(error.message || "Request failed");
          err.status = response.status;
          throw err;
        }

        const data = await response.json();
        console.log("✅ GET Success");

        // Check if response has .data property
        let result: T;
        if (data && typeof data === "object" && "data" in data) {
          result = data.data;
        } else {
          result = data;
        }

        // Cache the result for auth endpoints
        if (useCache && endpoint === "/auth/me") {
          this.requestCache.set(endpoint, { data: result, timestamp: Date.now() });
        }

        return result;
      } catch (error: any) {
        const isLastAttempt = attempt === this.retryConfig.maxRetries;

        // Check if error is retryable
        if (!this.isRetryableError(error) || isLastAttempt) {
          console.error("❌ GET Failed (no retry):", error);
          error.message = this.getErrorMessage(error, attempt);
          throw error;
        }

        // Calculate delay and retry
        const delay = this.getRetryDelay(attempt);
        console.warn(`⚠️ GET attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);

        // Dispatch retry event for UI feedback
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("api-retry", {
            detail: { attempt: attempt + 1, maxRetries: this.retryConfig.maxRetries }
          }));
        }

        await this.sleep(delay);
      }
    }

    throw new Error("Request failed after all retries");
  }

  // Clear cache when needed (e.g., on logout)
  clearCache() {
    this.requestCache.clear();
  }

  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Check if online before making request
    if (!this.checkOnline()) {
      throw new Error("អ្នកមិនមានអ៊ីនធឺណិតទេ • No internet connection");
    }

    console.log("📤 POST:", url);

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      const headers = this.getHeaders();

      try {
        // Add timeout for better UX (30 seconds for POST)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: body ? JSON.stringify(body) : undefined,
          cache: "no-store",
          credentials: "include", // ✅ iOS 16 FIX: Required for PWA mode
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log("📥 Response status:", response.status);

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
          }));
          console.error("❌ POST Error:", error);
          const err: any = new Error(error.message || "Request failed");
          err.status = response.status;
          throw err;
        }

        const fullResponse: ApiResponse<T> = await response.json();
        console.log("✅ POST Success");
        return fullResponse.data;
      } catch (error: any) {
        const isLastAttempt = attempt === this.retryConfig.maxRetries;

        // Check if error is retryable
        if (!this.isRetryableError(error) || isLastAttempt) {
          console.error("❌ POST Failed (no retry):", error);
          error.message = this.getErrorMessage(error, attempt);
          throw error;
        }

        // Calculate delay and retry
        const delay = this.getRetryDelay(attempt);
        console.warn(`⚠️ POST attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);

        // Dispatch retry event for UI feedback
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("api-retry", {
            detail: { attempt: attempt + 1, maxRetries: this.retryConfig.maxRetries }
          }));
        }

        await this.sleep(delay);
      }
    }

    throw new Error("Request failed after all retries");
  }

  async put<T = any>(endpoint: string, body?: any): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Check if online before making request
    if (!this.checkOnline()) {
      throw new Error("អ្នកមិនមានអ៊ីនធឺណិតទេ • No internet connection");
    }

    console.log("📤 PUT:", url);

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      const headers = this.getHeaders();

      try {
        // Add timeout for better UX (30 seconds for PUT)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          method: "PUT",
          headers,
          body: body ? JSON.stringify(body) : undefined,
          cache: "no-store",
          credentials: "include", // ✅ iOS 16 FIX: Required for PWA mode
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log("📥 Response status:", response.status);

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
          }));
          console.error("❌ PUT Error:", error);
          const err: any = new Error(error.message || "Request failed");
          err.status = response.status;
          throw err;
        }

        const data: ApiResponse<T> = await response.json();
        console.log("✅ PUT Success");

        // Check if wrapped in {success, data}
        if (data && typeof data === "object" && "data" in data) {
          return data.data;
        }

        return data as T;
      } catch (error: any) {
        const isLastAttempt = attempt === this.retryConfig.maxRetries;

        // Check if error is retryable
        if (!this.isRetryableError(error) || isLastAttempt) {
          console.error("❌ PUT Failed (no retry):", error);
          error.message = this.getErrorMessage(error, attempt);
          throw error;
        }

        // Calculate delay and retry
        const delay = this.getRetryDelay(attempt);
        console.warn(`⚠️ PUT attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);

        // Dispatch retry event for UI feedback
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("api-retry", {
            detail: { attempt: attempt + 1, maxRetries: this.retryConfig.maxRetries }
          }));
        }

        await this.sleep(delay);
      }
    }

    throw new Error("Request failed after all retries");
  }

  async patch<T = any>(endpoint: string, body?: any): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Check if online before making request
    if (!this.checkOnline()) {
      throw new Error("អ្នកមិនមានអ៊ីនធឺណិតទេ • No internet connection");
    }

    console.log("📤 PATCH:", url);

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      const headers = this.getHeaders();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          method: "PATCH",
          headers,
          body: body ? JSON.stringify(body) : undefined,
          cache: "no-store",
          credentials: "include", // ✅ iOS 16 FIX: Required for PWA mode
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log("📥 Response status:", response.status);

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
          }));
          console.error("❌ PATCH Error:", error);
          const err: any = new Error(error.message || "Request failed");
          err.status = response.status;
          throw err;
        }

        const data: ApiResponse<T> = await response.json();
        console.log("✅ PATCH Success");

        // Check if wrapped in {success, data}
        if (data && typeof data === "object" && "data" in data) {
          return data.data;
        }

        return data as T;
      } catch (error: any) {
        const isLastAttempt = attempt === this.retryConfig.maxRetries;

        // Check if error is retryable
        if (!this.isRetryableError(error) || isLastAttempt) {
          console.error("❌ PATCH Failed (no retry):", error);
          error.message = this.getErrorMessage(error, attempt);
          throw error;
        }

        // Calculate delay and retry
        const delay = this.getRetryDelay(attempt);
        console.warn(`⚠️ PATCH attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);

        // Dispatch retry event for UI feedback
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("api-retry", {
            detail: { attempt: attempt + 1, maxRetries: this.retryConfig.maxRetries }
          }));
        }

        await this.sleep(delay);
      }
    }

    throw new Error("Request failed after all retries");
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Check if online before making request
    if (!this.checkOnline()) {
      throw new Error("អ្នកមិនមានអ៊ីនធឺណិតទេ • No internet connection");
    }

    console.log("📤 DELETE:", url);

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      const headers = this.getHeaders();

      try {
        // Add timeout for better UX (30 seconds for DELETE)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          method: "DELETE",
          headers,
          cache: "no-store",
          credentials: "include", // ✅ iOS 16 FIX: Required for PWA mode
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log("📥 Response status:", response.status);

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
          }));
          console.error("❌ DELETE Error:", error);
          const err: any = new Error(error.message || "Request failed");
          err.status = response.status;
          throw err;
        }

        const data: ApiResponse<T> = await response.json();
        console.log("✅ DELETE Success");
        return data.data;
      } catch (error: any) {
        const isLastAttempt = attempt === this.retryConfig.maxRetries;

        // Check if error is retryable
        if (!this.isRetryableError(error) || isLastAttempt) {
          console.error("❌ DELETE Failed (no retry):", error);
          error.message = this.getErrorMessage(error, attempt);
          throw error;
        }

        // Calculate delay and retry
        const delay = this.getRetryDelay(attempt);
        console.warn(`⚠️ DELETE attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);

        // Dispatch retry event for UI feedback
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("api-retry", {
            detail: { attempt: attempt + 1, maxRetries: this.retryConfig.maxRetries }
          }));
        }

        await this.sleep(delay);
      }
    }

    throw new Error("Request failed after all retries");
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
