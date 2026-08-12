import { useState } from 'react';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import Button from '../shared/Button';

interface SlackSimulatorProps {
  onSend: (message: string) => void;
  isProcessing: boolean;
}

export default function SlackSimulator({ onSend, isProcessing }: SlackSimulatorProps) {
  const [message, setMessage] = useState('');
  const [showPreset, setShowPreset] = useState(true);

  const presets = [
    {
      label: 'Cancel Request',
      message: 'Customer XYZ is unhappy and wants to cancel. Can we do something?',
      icon: '🚨',
    },
    {
      label: 'Churn Signal',
      message: 'GlobalTech Solutions just sent a termination notice. Losing them would hurt.',
      icon: '⚠️',
    },
    {
      label: 'Angry Ticket Spike',
      message: 'Support just flagged 4 angry tickets from Nimbus Retail in the last hour, mostly about the new billing UI. They\'re a top-20 account.',
      icon: '🔥',
    },
    {
      label: 'Upsell Signal',
      message: 'Bright Path Media has been hitting their seat limit for 3 weeks straight and keeps asking about the enterprise plan.',
      icon: '📈',
    },
    {
      label: 'Renewal Question',
      message: 'Finance at Meridian Labs is asking what happens to pricing if they renew a year early — sounds like they want a deal.',
      icon: '📝',
    },
    {
      label: 'Custom',
      message: '',
      icon: '💬',
    },
  ];

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isProcessing) return;
    setShowPreset(false);
    onSend(trimmed);
  };

  const handlePreset = (presetMessage: string) => {
    setMessage(presetMessage);
    setShowPreset(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-background-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground font-heading">Simulated Slack Message</p>
          <p className="text-xs text-foreground-secondary">#exec-team · Acme SaaS Workspace</p>
        </div>
      </div>

      {/* Preset picker */}
      {showPreset && (
        <div className="p-5 space-y-3">
          <p className="text-sm text-foreground-secondary font-medium">
            Choose a scenario to demo:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset.message)}
                className="text-left p-4 rounded-lg border border-border bg-muted hover:bg-muted-hover hover:border-border-strong transition-all duration-150 cursor-pointer group"
              >
                <span className="text-2xl block mb-2">{preset.icon}</span>
                <span className="text-sm font-semibold text-foreground block font-heading group-hover:text-primary transition-colors">
                  {preset.label}
                </span>
                <span className="text-xs text-foreground-secondary mt-1 block">
                  {preset.message || 'Type your own scenario'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {!showPreset && (
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-md bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-accent font-heading">JD</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-semibold text-foreground">Jamie Davis</span>
                <span className="text-xs text-foreground-secondary">10:32 AM</span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                placeholder="Type a Slack message that triggers the AI CEO..."
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary/60 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150 disabled:opacity-50"
                rows={2}
                autoFocus
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-foreground-secondary">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-heading">Enter</kbd> to send
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPreset(true)}
                    className="text-xs text-foreground-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    Back to presets
                  </button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSend}
                    disabled={!message.trim() || isProcessing}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showPreset && !isProcessing && message && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-foreground-secondary">
              AI CEO will parse this message, identify the customer, analyze their data, and execute the full retention workflow.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
