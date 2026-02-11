'use client';

/**
 * Generate Claim Codes Modal
 * 
 * Allows school admins to generate new claim codes in bulk
 */

import { useState } from 'react';
import { claimCodeService } from '@/lib/api/claimCodes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, Copy, Download } from 'lucide-react';

interface GenerateCodesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodesGenerated: () => void;
  schoolId: string;
}

export default function GenerateCodesModal({
  open,
  onOpenChange,
  onCodesGenerated,
  schoolId,
}: GenerateCodesModalProps) {
  const [type, setType] = useState<string>('STUDENT');
  const [count, setCount] = useState<number>(10);
  const [expiresIn, setExpiresIn] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const codes = await claimCodeService.generate(schoolId, {
        type,
        count,
        expiresInDays: expiresIn,
      });

      setGeneratedCodes(codes);
      onCodesGenerated();
    } catch (err: any) {
      setError(err.message || 'Failed to generate claim codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCodes = () => {
    if (!generatedCodes) return;
    navigator.clipboard.writeText(generatedCodes.join('\n'));
  };

  const handleDownloadCodes = () => {
    if (!generatedCodes) return;
    
    const blob = new Blob([generatedCodes.join('\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claim-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleClose = () => {
    setGeneratedCodes(null);
    setError(null);
    setType('STUDENT');
    setCount(10);
    setExpiresIn(30);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Claim Codes</DialogTitle>
          <DialogDescription>
            Create new claim codes for students, teachers, or staff members
          </DialogDescription>
        </DialogHeader>

        {!generatedCodes ? (
          // Generation Form
          <div className="space-y-4 py-4">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="type">Code Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="PARENT">Parent</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Select who can use these codes to register
              </p>
            </div>

            {/* Count Input */}
            <div className="space-y-2">
              <Label htmlFor="count">Number of Codes</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="500"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                placeholder="10"
              />
              <p className="text-xs text-gray-500">
                Generate between 1 and 500 codes at once
              </p>
            </div>

            {/* Expiration Input */}
            <div className="space-y-2">
              <Label htmlFor="expires">Expires In (Days)</Label>
              <Input
                id="expires"
                type="number"
                min="1"
                max="365"
                value={expiresIn}
                onChange={(e) => setExpiresIn(parseInt(e.target.value) || 30)}
                placeholder="30"
              />
              <p className="text-xs text-gray-500">
                Codes will expire after this many days
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          // Success View
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Successfully generated {generatedCodes.length} claim codes!
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Generated Codes</Label>
              <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="space-y-1 font-mono text-sm">
                  {generatedCodes.map((code, index) => (
                    <div key={index} className="text-gray-700">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Save these codes securely. They won't be shown again.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopyCodes}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownloadCodes}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedCodes ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Codes
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
