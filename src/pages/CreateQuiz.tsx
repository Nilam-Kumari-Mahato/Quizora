import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Image as ImageIcon, ArrowLeft, Settings, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type Question = {
  question_text: string;
  question_image_url: string;
  options: string[];
  correct_answer: string;
  time_limit: number;
  order_number: number;
};

const CreateQuiz = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quizIdParam = searchParams.get("quizId");

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      question_text: "",
      question_image_url: "",
      options: ["", ""],
      correct_answer: "A",
      time_limit: 30,
      order_number: 0
    }
  ]);
  const [timeForAll, setTimeForAll] = useState(30);
  const [showSettings, setShowSettings] = useState(false);
  const [applyDefaultTime, setApplyDefaultTime] = useState(false);

  // Fetch existing quiz data if in edit mode
  const existingQuiz = useQuery(
    api.quizzes.getQuizDetails,
    quizIdParam ? { id: quizIdParam as Id<"quizzes"> } : "skip"
  );

  const createQuizMutation = useMutation(api.quizzes.createQuiz);
  const editQuizMutation = useMutation(api.quizzes.editQuiz);

  // Populate form when existing data loads
  useEffect(() => {
    if (existingQuiz) {
      setTitle(existingQuiz.quiz.title);
      setDescription(existingQuiz.quiz.description || "");

      if (existingQuiz.questions.length > 0) {
        const formattedQuestions: Question[] = existingQuiz.questions.map(q => {
          const options = [q.option_a, q.option_b];
          if (q.option_c) options.push(q.option_c);
          if (q.option_d) options.push(q.option_d);

          return {
            question_text: q.question_text,
            question_image_url: q.question_image_url || "",
            options: options,
            correct_answer: q.correct_answer,
            time_limit: q.time_limit,
            order_number: q.order_number,
          };
        });
        setQuestions(formattedQuestions);
      }
    }
  }, [existingQuiz]);

  const TIME_OPTIONS: { label: string; value: number }[] = [
    { label: "5 secs", value: 5 },
    { label: "10 secs", value: 10 },
    { label: "15 secs", value: 15 },
    { label: "20 secs", value: 20 },
    { label: "25 secs", value: 25 },
    { label: "30 secs", value: 30 },
    { label: "45 secs", value: 45 },
    { label: "50 secs", value: 50 },
    { label: "1 min", value: 60 },
    { label: "1 min 30 secs", value: 90 },
    { label: "2 min", value: 120 },
    { label: "3 min", value: 180 },
    { label: "5 min", value: 300 },
    { label: "7 min", value: 420 },
    { label: "10 min", value: 600 },
  ];

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        question_image_url: "",
        options: ["", ""],
        correct_answer: "A",
        time_limit: applyDefaultTime ? timeForAll : 30,
        order_number: questions.length,
      },
    ]);
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

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const opts = [...updated[qIndex].options];
    opts[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    const opts = [...updated[qIndex].options];

    if (opts.length >= 4) {
      toast({ title: "Maximum Options", description: "You can add up to 4 options.", variant: "destructive" });
      return;
    }

    opts.push("");
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    const opts = [...updated[qIndex].options];
    if (opts.length <= 2) return;
    opts.splice(optIndex, 1);
    const letters = opts.map((_, i) => String.fromCharCode(65 + i));
    let correct = updated[qIndex].correct_answer;
    if (!letters.includes(correct)) correct = letters[0] || "A";
    updated[qIndex] = { ...updated[qIndex], options: opts, correct_answer: correct };
    setQuestions(updated);
  };

  const applyTimeToAll = () => {
    setQuestions(questions.map(q => ({ ...q, time_limit: timeForAll })));
    toast({ title: "Success", description: `Time limit set to ${timeForAll} seconds for all questions.` });
  };

  const saveDraft = () => {
    try {
      const draft = { title, description, questions, timeForAll, applyDefaultTime };
      localStorage.setItem("quiz_draft", JSON.stringify(draft));
      toast({ title: "Saved", description: "Quiz saved to drafts" });
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to save draft: ${e.message}`, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a quiz title", variant: "destructive" });
      return;
    }

    for (const q of questions) {
      if (!q.question_text.trim()) {
        toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
        return;
      }
      if (!q.options[0]?.trim() || !q.options[1]?.trim()) {
        toast({ title: "Error", description: "Each question needs at least two options", variant: "destructive" });
        return;
      }
      const letters = q.options.map((_, i) => String.fromCharCode(65 + i));
      if (!letters.includes(q.correct_answer)) {
        toast({ title: "Error", description: "Correct answer must match an available option", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const mappedQuestions = questions.map((q, index) => {
        const mapped: any = {
          question_text: q.question_text,
          question_image_url: q.question_image_url || undefined,
          correct_answer: q.correct_answer,
          time_limit: q.time_limit,
          order_number: index,
        };

        q.options.forEach((opt, i) => {
          const letter = String.fromCharCode(97 + i);
          mapped[`option_${letter}`] = opt;
        });

        return mapped;
      });

      if (quizIdParam) {
        // --- EDIT MODE ---
        await editQuizMutation({
          quizId: quizIdParam as Id<"quizzes">,
          title,
          description,
          questions: mappedQuestions,
        });
        toast({ title: "Success!", description: "Quiz updated successfully" });
      } else {
        // --- CREATE MODE ---
        await createQuizMutation({
          title,
          description,
          questions: mappedQuestions,
        });
        toast({ title: "Success!", description: "Quiz created successfully" });
      }

      navigate("/dashboard");

    } catch (error: any) {
      toast({ title: "Error", description: `Failed to save quiz: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (quizIdParam && !existingQuiz) {
    return <div className="min-h-screen flex items-center justify-center">Loading quiz data...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white/40 via-accent/60 to-white/80 dark:bg-gradient-to-b dark:from-black/80 dark:via-black/80 dark:to-black/80 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <Card className="p-2 sm:p-5 md:p-6 lg:p-8 shadow-lg rounded-2xl border-2 border-transparent hover:border-primary transition-all duration-300">
          <h1 className="text-2xl sm:text-2xl md:text-2xl lg:text-4xl font-bold mb-8 bg-gradient-to-b from-primary to-secondary via-orange-300 bg-clip-text text-transparent">
            {quizIdParam ? "Edit Quiz" : "Create Your Quiz"}
          </h1>

          <div className="space-y-6 mb-8">
            <div>
              <Label htmlFor="title" className="dark:text-white">Quiz Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter an exciting title"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description" className="dark:text-white">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this quiz about?"
                className="mt-2"
              />
            </div>
          </div>

          <div className="space-y-6 px-2">
            <div className="relative">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Questions</h2>
                <Button
                  variant="link"
                  onClick={() => setShowSettings((s) => !s)}
                  className="rounded-full text-gray-500 "
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>

              {showSettings && (
                <Card className="absolute right-0 mt-2 w-80 p-4 z-20 dark:text-secondary">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold">Quiz Settings</h3>
                    <Button variant="link" size="sm" className="no-underline hover:no-underline rounded-full text-gray-400" onClick={() => setShowSettings(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mb-3">
                    <Label>Default Time </Label>
                    <div className="flex items-center gap-1 mt-2">
                      <select
                        value={timeForAll}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          setTimeForAll(v);
                          if (applyDefaultTime) {
                            setQuestions(prev => prev.map(q => ({ ...q, time_limit: v })));
                          }
                        }}
                        className="flex-1 p-2 border rounded-md w-3"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>

                      <label className="flex items-center gap-2 ml-2">
                        <input
                          type="checkbox"
                          checked={applyDefaultTime}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setApplyDefaultTime(checked);
                            if (checked) {
                              applyTimeToAll();
                            }
                          }}
                        />
                        <span className="text-sm">Apply to All</span>
                      </label>
                    </div>


                  </div>

                  <div className="border-t pt-3 flex justify-end">
                    <Button size="sm" onClick={() => { applyTimeToAll(); setApplyDefaultTime(true); }} className="rounded-full hover:bg-secondary">
                      Save
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {questions.map((question, index) => (
              <Card key={index} className="p-2 sm:p-2 md:p-4 lg:p-6 border-2">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-secondary">Question {index + 1}</h3>
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="dark:hover:bg-primary-foreground"
                      onClick={() => removeQuestion(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="dark:text-white">Question Text *</Label>
                    <Textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                      placeholder="Enter your question"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="dark:text-white">Image URL (optional)</Label>
                    <div className="flex gap-2 mt-2">
                      <ImageIcon className="text-muted-foreground mt-2" />
                      <Input
                        value={question.question_image_url}
                        onChange={(e) => updateQuestion(index, 'question_image_url', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {question.options.map((opt, optIndex) => {
                      const letter = String.fromCharCode(65 + optIndex); // A, B, C...
                      return (
                        <div key={optIndex} className="flex items-start gap-3">
                          <div className="w-full">
                            <Label className="dark:text-white">{`Option ${letter}${optIndex < 2 ? ' *' : ''}`}</Label>
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(index, optIndex, e.target.value)}
                              placeholder={`Option ${letter}`}
                              className="mt-2 text-xs"
                            />
                          </div>
                          <div className="flex-1">
                            {/* spacer for layout - option text already inline */}
                          </div>
                          <div className="mt-6">
                            {question.options.length > 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(index, optIndex)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => addOption(index)}
                        size="sm"
                        className="rounded-full dark:hover:bg-primary-foreground dark:hover:text-white/70 dark:text-secondary"
                        disabled={question.options.length >= 4} // Disable adding more than 4 options
                      >
                        <Plus className="h-4 w-4" />
                        Add Option
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label className="dark:text-white">Correct Answer *</Label>
                      <select
                        value={question.correct_answer}
                        onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                        className="w-full mt-2 p-2 border rounded-md pr-3"
                      >
                        {question.options.map((_, i) => {
                          const letter = String.fromCharCode(65 + i);
                          return (
                            <option key={i} value={letter}>{letter}</option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="dark:text-white">Time Limit *</Label>
                      <select
                        value={question.time_limit}
                        onChange={(e) => updateQuestion(index, 'time_limit', parseInt(e.target.value))}
                        className="w-full mt-2 p-2 border rounded-md pr-3"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="flex flex-col lg:flex-row justify-between">

            <div className="mt-5">
              <Button variant="ghost" onClick={addQuestion} className="rounded-full p-2 dark:hover:bg-primary-foreground dark:hover:text-white/70 dark:text-secondary">
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            </div>
            <div className="w-23 mt-5 ml-12">
              <Button
                onClick={handleSave}
                disabled={loading}
                size="lg"
                className="text-lg bg-gradient-to-b from-primary via-secondary to-accent hover:opacity-90 rounded-full hover:text-primary-foreground"
              >
                {loading ? "Saving..." : (quizIdParam ? "Update Quiz" : "Create Quiz")}
              </Button>
            </div>

            
          </div>

          
        </Card>
      </div>
    </div>
  );
};

export default CreateQuiz;
