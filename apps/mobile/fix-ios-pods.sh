#!/bin/bash
# Stunity-Enterprise: macOS M-Series CocoaPods Fix

echo "🚀 Starting CocoaPods architecture fix for Apple Silicon..."

# 1. Clear out the problematic Pods and lockfile
echo "🧹 Cleaning previous iOS build state..."
cd ios
rm -rf Pods
rm -f Podfile.lock
cd ..

# 2. Try to install dependencies natively first
echo "📦 Installing CocoaPods dependencies..."
npx pod-install ios

# 3. If it failed, it's the classic ffi error. Install ffi natively.
if [ $? -ne 0 ]; then
  echo "⚠️ Native pod install failed (ffi architecture mismatch)."
  echo "🔧 Installing ffi for arm64..."
  
  # Request password cleanly for sudo
  echo "Please enter your Mac password to install the ffi Ruby gem:"
  sudo arch -arm64 gem install ffi

  echo "♻️ Retrying pod install natively..."
  cd ios
  arch -arm64 pod install --repo-update
  cd ..
  
  if [ $? -ne 0 ]; then
    echo "⚠️ Native retry failed. Falling back to Rosetta 2 x86_64 emulation..."
    echo "This is normal for older native React Native modules."
    cd ios
    arch -x86_64 pod install --repo-update
    cd ..
  fi
fi

echo "✅ CocoaPods setup complete! You can now run the app:"
echo "npx expo run:ios"
