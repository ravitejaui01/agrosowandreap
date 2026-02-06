import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sprout,
  Users,
  ClipboardCheck,
  Shield,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Field Agent Registration",
    description: "Register farmers with comprehensive data collection including personal details, land information, and document uploads.",
  },
  {
    icon: ClipboardCheck,
    title: "Multi-Level Validation",
    description: "Ensure data accuracy through a structured review process with validators and verified officers.",
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    description: "Role-based access control ensures data security and accountability at every step.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Monitoring",
    description: "Track record status, generate reports, and gain insights with comprehensive dashboards.",
  },
];

const roles = [
  {
    title: "Data Validator",
    description: "Review and verify submissions",
    path: "/validator",
    color: "bg-warning/10 border-warning/30 hover:bg-warning/20",
    iconBg: "bg-warning text-warning-foreground",
  },
  {
    title: "Verified Officer",
    description: "Final approval authority",
    path: "/officer",
    color: "bg-primary/10 border-primary/30 hover:bg-primary/20",
    iconBg: "bg-primary text-primary-foreground",
  },
  {
    title: "Administrator",
    description: "System management & reporting",
    path: "/admin",
    color: "bg-accent/10 border-accent/30 hover:bg-accent/20",
    iconBg: "bg-accent text-accent-foreground",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Sprout className="h-5 w-5 text-sidebar-primary" />
              <span className="text-sm font-medium text-white/90">Farmer Management System</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
              Farmer Data Verification
              <br />
              <span className="text-sidebar-primary">& Management System</span>
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              A role-based digital platform designed to collect, validate, verify, and manage farmer registration data in a secure and structured workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Learn More
              </Button>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              className="fill-background"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Streamlined Verification Process
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our multi-level validation process improves data reliability, transparency, and operational efficiency.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl border border-border bg-card hover:shadow-elevated transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Follow the complete data verification workflow from registration to approval.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Connection line */}
              <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-border hidden md:block" />

              {[
                { step: 1, title: "Data Collection", desc: "Field agents register farmers with personal details, land information, and upload required documents." },
                { step: 2, title: "Initial Validation", desc: "Data validators review submitted records, verify documents, and request corrections if needed." },
                { step: 3, title: "Final Verification", desc: "Verified officers perform compliance checks and give final approval on validated records." },
                { step: 4, title: "Active Record", desc: "Approved farmer records become active in the system for program enrollment and services." },
              ].map((item, index) => (
                <div key={item.step} className="relative flex gap-6 mb-8 last:mb-0">
                  <div className="relative z-10 flex-shrink-0 h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                    {item.step}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Select Your Role
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Access your personalized dashboard based on your role in the verification process.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {roles.map((role, index) => (
              <Link
                key={role.title}
                to={role.path}
                className={`group p-6 rounded-xl border-2 transition-all duration-300 animate-slide-up ${role.color}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`h-12 w-12 rounded-lg ${role.iconBg} flex items-center justify-center mb-4`}>
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{role.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  Enter Dashboard
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                <Sprout className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold">FarmerVerify</p>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 FarmerVerify. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
