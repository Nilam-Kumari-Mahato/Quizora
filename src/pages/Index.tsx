import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Sparkles, Users, Zap } from "lucide-react";
import { Authenticated } from "convex/react"; 

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-6xl md:text-7xl font-black mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Quiz
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Create engaging quizzes and compete in real-time!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          
          {/* V 2. Wrap this Card V */}
          <Authenticated>
            <Card 
              className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-primary"
              onClick={() => navigate('/create-quiz')}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold">Create Quiz</h2>
                <p className="text-muted-foreground">
                  Design your own quiz with custom questions, images, and timers
                </p>
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                >
                  Start Creating
                </Button>
              </div>
            </Card>
          </Authenticated>
          {/* ^ 2. End of wrapper ^ */}

          <Card 
            className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-secondary"
            onClick={() => navigate('/join')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                <Users className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Join Quiz</h2>
              <p className="text-muted-foreground">
                Enter a quiz code and compete with others in real-time
              </p>
              <Button 
                size="lg" 
                className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90"
              >
                Join Now
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { icon: Zap, title: "Real-time Updates", desc: "See results instantly as participants answer" },
            { icon: Users, title: "Multiplayer Fun", desc: "Compete with friends and track the leaderboard" },
            { icon: Sparkles, title: "Custom Content", desc: "Add text or images to your questions" }
          ].map((feature, i) => (
            <div key={i} className="text-center p-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
              <feature.icon className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;