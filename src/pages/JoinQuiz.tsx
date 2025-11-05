import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Clock } from "lucide-react";

const JoinQuiz = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  const joinQuiz = async () => {
    if (!code.trim() || !name.trim()) {
      toast({ 
        title: "Missing Information", 
        description: "Please enter both quiz code and your name",
        variant: "destructive" 
      });
      return;
    }

    // For demo purposes, check if code is "1234"
    if (code.toUpperCase() !== "1234") {
      toast({ 
        title: "Invalid Code", 
        description: "Quiz code not found. Try '1234' for demo.",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with your backend API call
      // const response = await fetch(`/api/sessions/join`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ code: code.toUpperCase(), name })
      // });
      // const data = await response.json();
      
      // Simulate joining - Auto-start quiz for code 1234
      setTimeout(() => {
        setLoading(false);
        if (code === "1234") {
          navigate(`/play/session-1234?participant=${name}`);
        } else {
          setJoined(true);
          setParticipantCount(Math.floor(Math.random() * 10) + 1);
        }
      }, 1000);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  if (joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-accent/10 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-primary/10 rounded-full mb-4 animate-pulse">
              <Clock className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-5xl font-bold text-primary">
              Welcome, {name}!
            </h1>
            <p className="text-2xl text-muted-foreground">
              Waiting for host to start the quiz...
            </p>
          </div>

          <Card className="p-8 bg-card border-border">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <Users className="w-12 h-12 text-primary mx-auto mb-3" />
                <p className="text-5xl font-bold text-primary mb-2">
                  {participantCount}
                </p>
                <p className="text-lg text-muted-foreground">
                  Participants Joined
                </p>
              </div>
            </div>
          </Card>

          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Quiz Code: <span className="text-2xl font-bold text-primary">{code}</span>
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setJoined(false);
                setCode("");
                setName("");
              }}
              className="border-primary text-primary hover:bg-primary hover:text-background"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Leave Quiz
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border rounded-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-primary hover:text-primary hover:bg-primary/10 hover: rounded-full"
        >
          <ArrowLeft className=" h-4 w-4" />
          Back
        </Button>

        <h1 className="text-4xl font-bold mb-2 text-primary">
          Join Quiz
        </h1>
        <p className="text-muted-foreground mb-8">
          Enter the quiz code to get started
        </p>

        <div className="space-y-6">
          <div>
            <Label htmlFor="code" className="text-foreground">Quiz Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter code (try 1234)"
              maxLength={6}
              className="mt-2 text-center text-xl font-bold tracking-widest rounded-xl bg-input border-border placeholder:text-xs md:placeholder:text-sm"
            />
          </div>

          <div>
            <Label htmlFor="name" className="text-foreground">Your Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-2 bg-input border-border rounded-xl text-foreground"
            />
          </div>

          <div className="flex justify-center">
            <Button
              onClick={joinQuiz}
              disabled={loading}
              size="lg"
              className="w-48 bg-primary text-primary-foreground hover:bg-primary/80 rounded-full"
            >
              {loading ? "Joining..." : "Join Quiz"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default JoinQuiz;