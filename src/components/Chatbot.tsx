
'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { planTrip } from '@/ai/flows/trip-planner-flow';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';

type Message = {
  sender: 'user' | 'bot';
  text: string;
};

type ChatbotProps = {
    onSearch: (search: any) => void;
}

export function Chatbot({ onSearch }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (isOpen) {
        setIsThinking(true);
        setTimeout(() => {
            setMessages([
                { sender: 'bot', text: 'Bonjour ! Comment puis-je vous aider à trouver votre prochain covoiturage ? Dites-moi simplement où vous voulez aller. Par exemple: "Un trajet de Montréal à Québec demain."' }
            ]);
            setIsThinking(false);
        }, 1000);
    } else {
        setMessages([]);
        setInputValue('');
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = { sender: 'user', text: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    try {
      const result = await planTrip(inputValue);
      
      const botResponse = `Super ! J'ai configuré la recherche pour un trajet de ${result.departure || '...'} à ${result.destination || '...'}${result.date ? ` pour le ${new Date(result.date).toLocaleDateString('fr-CA', { timeZone: 'UTC' })}` : ''}. Vous pouvez ajuster les détails ci-dessus.`;

      setMessages((prev) => [...prev, { sender: 'bot', text: botResponse }]);
      onSearch(result);

    } catch (error) {
      console.error('Error planning trip:', error);
      setMessages((prev) => [...prev, { sender: 'bot', text: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer." }]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-8 right-8 rounded-full w-16 h-16 shadow-lg"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le chatbot"
      >
        <MessageSquare className="w-8 h-8" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-8 right-8 w-96 shadow-xl rounded-2xl flex flex-col h-[60vh]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              <MessageSquare />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-lg">Assistant OptiTrajet</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={cn(
              'flex items-start gap-3',
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.sender === 'bot' && (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  <MessageSquare size={20}/>
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                'p-3 rounded-xl max-w-xs',
                msg.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              <p className="text-sm">{msg.text}</p>
            </div>
             {msg.sender === 'user' && (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  <User size={20}/>
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isThinking && (
            <div className="flex items-start gap-3 justify-start">
                 <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    <MessageSquare size={20}/>
                    </AvatarFallback>
                </Avatar>
                <div className="p-3 rounded-xl bg-muted flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Écrivez votre message..."
            disabled={isThinking}
            autoFocus
          />
          <Button type="submit" size="icon" disabled={isThinking}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
