import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Upload, Check, User, MapPin, Tractor, FileText, PenTool } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const steps = [
  { id: 1, title: "Personal Info", icon: User },
  { id: 2, title: "Address", icon: MapPin },
  { id: 3, title: "Land Details", icon: Tractor },
  { id: 4, title: "Documents", icon: FileText },
  { id: 5, title: "Signature", icon: PenTool },
];

const cropOptions = [
  "Maize", "Wheat", "Rice", "Beans", "Coffee", "Tea", "Sugarcane", 
  "Cotton", "Sunflower", "Barley", "Sorghum", "Millet", "Other"
];

export default function RegisterFarmer() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    toast.success("Farmer registration submitted successfully!", {
      description: "The record has been sent for validation.",
    });
    navigate("/agent");
  };

  const toggleCrop = (crop: string) => {
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  };

  return (
    <DashboardLayout userRole="field_agent" userName="John Kimani">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/agent">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Register New Farmer</h1>
            <p className="text-muted-foreground">Complete all steps to submit registration</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                    currentStep > step.id
                      ? "bg-success text-success-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 font-medium hidden sm:block ${
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 sm:w-16 mx-2 ${
                    currentStep > step.id ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>
              Step {currentStep} of {steps.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" placeholder="Enter first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" placeholder="Enter last name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input id="dob" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" placeholder="+254 712 345 678" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input id="email" type="email" placeholder="email@example.com" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nationalId">National ID Number *</Label>
                  <Input id="nationalId" placeholder="Enter national ID" />
                </div>
              </div>
            )}

            {/* Step 2: Address */}
            {currentStep === 2 && (
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="village">Village/Town *</Label>
                  <Input id="village" placeholder="Enter village or town name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District *</Label>
                  <Input id="district" placeholder="Enter district" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region/Province *</Label>
                  <Input id="region" placeholder="Enter region" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="country">Country *</Label>
                  <Select defaultValue="kenya">
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kenya">Kenya</SelectItem>
                      <SelectItem value="uganda">Uganda</SelectItem>
                      <SelectItem value="tanzania">Tanzania</SelectItem>
                      <SelectItem value="ethiopia">Ethiopia</SelectItem>
                      <SelectItem value="rwanda">Rwanda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Land Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="landSize">Land Size *</Label>
                    <Input id="landSize" type="number" placeholder="Enter land size" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landUnit">Unit *</Label>
                    <Select defaultValue="acres">
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acres">Acres</SelectItem>
                        <SelectItem value="hectares">Hectares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="farmingType">Farming Type *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select farming type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subsistence">Subsistence Farming</SelectItem>
                        <SelectItem value="commercial">Commercial Farming</SelectItem>
                        <SelectItem value="mixed">Mixed Farming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Crops Grown *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {cropOptions.map((crop) => (
                      <div
                        key={crop}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedCrops.includes(crop)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => toggleCrop(crop)}
                      >
                        <Checkbox checked={selectedCrops.includes(crop)} />
                        <span className="text-sm">{crop}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Documents */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Required Documents</Label>
                  {[
                    { id: "national_id", label: "National ID Card", required: true },
                    { id: "land_title", label: "Land Title / Ownership Document", required: true },
                    { id: "photo", label: "Passport Photo", required: false },
                  ].map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">
                          {doc.label}
                          {doc.required && <span className="text-destructive ml-1">*</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PDF, JPG, or PNG (max 5MB)
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information about the documents..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 5: Signature */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Digital Signature</Label>
                  <div className="h-48 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                    <div className="text-center">
                      <PenTool className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        Click or tap to draw signature
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Clear
                    </Button>
                    <Button variant="outline" size="sm">
                      Redo
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <Checkbox id="consent" />
                  <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                    I confirm that all the information provided is accurate and complete. I authorize
                    the collection and verification of this data for farmer registration purposes.
                  </Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          {currentStep < steps.length ? (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="gap-2 bg-success hover:bg-success/90">
              <Check className="h-4 w-4" />
              Submit Registration
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
