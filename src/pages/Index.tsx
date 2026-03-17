import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Sparkles, Users, Zap } from "lucide-react";
import { SignedIn } from "@clerk/clerk-react";
import Footer from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white/40 via-accent/60 to-white/80 dark:bg-gradient-to-b dark:from-black/80 dark:via-black/80 dark:to-black/80">
      <div className="fixed top-4 left-4 md:top-8 md:left-8 z-50">
        <img src="https://ik.imagekit.io/devsoc/Quizora/public/logo.png?updatedAt=1764162094557" alt="Quizora Logo" className="h-12 w-12 md:h-16 md:w-16" />
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16 mt-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-6xl md:text-7xl font-black mb-4 bg-gradient-to-b from-primary to-secondary bg-clip-text text-transparent font-serif">
            Quizora
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Create engaging quizzes and compete in real-time!
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto mb-16 justify-center items-center">

          <Card
            className="rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-secondary"
            onClick={() => navigate('/join')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-primary-glow flex items-center justify-center">
                <Users className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Join Quiz</h2>
              <p className="text-muted-foreground">
                Enter a quiz code and compete with others in real-time
              </p>
              <Button
                size="lg"
                className="rounded-full w-23 bg-gradient-to-r from-secondary to-primary-glow hover:opacity-90"
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
      <Footer />
    </div>
  );
};

export default Index;