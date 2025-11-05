import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { useMutation } from "convex/react"; // <-- 1. Add this import
import { api } from "../../convex/_generated/api"; // <-- 2. Add this import

type Question = {
  question_text: string;
  question_image_url: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  time_limit: number;
  order_number: number;
};

const CreateQuiz = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      question_text: "",
      question_image_url: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      time_limit: 30,
      order_number: 0
    }
  ]);

  // <-- 3. Get the mutation function
  const createQuizMutation = useMutation(api.quizzes.createQuiz);

  const addQuestion = () => {
    setQuestions([...questions, {
      question_text: "",
      question_image_url: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      time_limit: 30,
      order_number: questions.length
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: string | number) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const createQuiz = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a quiz title", variant: "destructive" });
      return;
    }

    if (questions.some(q => !q.question_text.trim() || !q.option_a.trim() || !q.option_b.trim())) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // <-- 4. Call the mutation correctly
      const quizId = await createQuizMutation({
        title,
        description,
        questions,
      });

      toast({ title: "Success!", description: "Quiz created successfully" });
      navigate(`/quiz/${quizId}`); // <-- 5. Navigate to the new quiz
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to create quiz: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="p-8">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Create Your Quiz
          </h1>

          <div className="space-y-6 mb-8">
            <div>
              <Label htmlFor="title">Quiz Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter an exciting title"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this quiz about?"
                className="mt-2"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Questions</h2>
              <Button onClick={addQuestion} className="bg-gradient-to-r from-primary to-secondary">
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>

            {questions.map((question, index) => (
              <Card key={index} className="p-6 border-2">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">Question {index + 1}</h3>
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Question Text *</Label>
                    <Textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                      placeholder="Enter your question"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Image URL (optional)</Label>
                    <div className="flex gap-2 mt-2">
                      <ImageIcon className="text-muted-foreground mt-2" />
                      <Input
                        value={question.question_image_url}
                        onChange={(e) => updateQuestion(index, 'question_image_url', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Option A *</Label>
                      <Input
                        value={question.option_a}
                        onChange={(e) => updateQuestion(index, 'option_a', e.target.value)}
                        placeholder="First option"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Option B *</Label>
                      <Input
                        value={question.option_b}
                        onChange={(e) => updateQuestion(index, 'option_b', e.target.value)}
                        placeholder="Second option"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Option C</Label>
                      <Input
                        value={question.option_c}
                        onChange={(e) => updateQuestion(index, 'option_c', e.target.value)}
                        placeholder="Third option (optional)"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Option D</Label>
                      <Input
                        value={question.option_d}
                        onChange={(e) => updateQuestion(index, 'option_d', e.target.value)}
                        placeholder="Fourth option (optional)"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Correct Answer *</Label>
                      <select
                        value={question.correct_answer}
                        onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                        className="w-full mt-2 p-2 border rounded-md"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                    <div>
                      <Label>Time Limit (seconds) *</Label>
                      <Input
                        type="number"
                        value={question.time_limit}
                        onChange={(e) => updateQuestion(index, 'time_limit', parseInt(e.target.value) || 30)}
                        min={5}
                        max={300}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex gap-4">
            <Button
              onClick={createQuiz}
              disabled={loading}
              size="lg"
              className="flex-1 bg-gradient-to-r from-primary via-secondary to-accent"
            >
              {loading ? "Creating..." : "Create Quiz"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreateQuiz;