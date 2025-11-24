import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export const StateDemo = () => {
    const { count, theme, increment, decrement, reset, toggleTheme } = useAppStore();

    return (
        <Card className="w-[350px] mx-auto mt-10">
            <CardHeader>
                <CardTitle>Zustand State Demo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Current Count</p>
                    <p className="text-4xl font-bold">{count}</p>
                </div>

                <div className="flex justify-center gap-2">
                    <Button onClick={decrement} variant="outline">-</Button>
                    <Button onClick={reset} variant="ghost">Reset</Button>
                    <Button onClick={increment} variant="outline">+</Button>
                </div>

                <div className="border-t pt-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Current Theme: {theme}</p>
                    <Button onClick={toggleTheme} className="w-full">
                        Toggle Theme State
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
