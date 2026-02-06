import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PenTool, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function SignatureUploadAddNew() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith("image/")) {
        toast.error("Please select an image file (PNG, JPG, etc.).");
        return;
      }
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreview(url);
    }
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload a signature image.");
      return;
    }
    toast.success("Signature uploaded successfully.");
    setTitle("");
    clearFile();
  };

  return (
    <DashboardLayout userName={user?.name ?? "Field Agent"}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Signature Upload</h1>
            <p className="text-muted-foreground">Add new signature</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              <CardTitle>Add New</CardTitle>
            </div>
            <CardDescription>Upload a signature image (PNG or JPG)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="e.g. Farmer consent"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Signature image</Label>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer file:mr-2 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:text-sm"
                  />
                  {file && (
                    <Button type="button" variant="outline" size="sm" onClick={clearFile}>
                      Clear
                    </Button>
                  )}
                </div>
                {preview && (
                  <div className="mt-2 p-3 rounded-lg border border-border bg-muted/20 inline-block">
                    <p className="text-xs text-muted-foreground mb-2">Preview</p>
                    <img src={preview} alt="Signature preview" className="max-h-24 object-contain" />
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full sm:w-auto gap-2">
                <Upload className="h-4 w-4" />
                Upload Signature
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
