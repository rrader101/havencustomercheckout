import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Calendar, Clock, Users, ArrowLeft } from 'lucide-react';

interface MeetingSchedulerProps {
  onBack: () => void;
  onComplete: () => void;
}

export const MeetingScheduler = ({ onBack, onComplete }: MeetingSchedulerProps) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [attendees, setAttendees] = useState(1);

  // Calculate 4 weeks from today
  const getDefaultDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 28); // 4 weeks = 28 days
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = () => {
    if (selectedDate && selectedTime) {
      onComplete();
    }
  };

  const isFormValid = selectedDate && selectedTime;

  return (
    <Card className="p-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl">Schedule Performance Review Meeting</CardTitle>
        </div>
        <p className="text-muted-foreground">
          Let's schedule a meeting to review your ad performance approximately 4 weeks from today
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Date Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Meeting Date</label>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getDefaultDate()}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Recommended: {new Date(getDefaultDate()).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Time Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Preferred Time</label>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a time</option>
              <option value="09:00">9:00 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="13:00">1:00 PM</option>
              <option value="14:00">2:00 PM</option>
              <option value="15:00">3:00 PM</option>
              <option value="16:00">4:00 PM</option>
            </select>
          </div>
        </div>

        {/* Attendees */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Number of Attendees</label>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <select
              value={attendees}
              onChange={(e) => setAttendees(Number(e.target.value))}
              className="px-3 py-2 border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value={1}>1 person</option>
              <option value={2}>2 people</option>
              <option value={3}>3 people</option>
              <option value={4}>4 people</option>
              <option value={5}>5+ people</option>
            </select>
          </div>
        </div>

        {/* Meeting Details */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Meeting Details</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 30-minute performance review session</li>
            <li>• Analysis of ad performance metrics</li>
            <li>• Strategy adjustments and recommendations</li>
            <li>• Q&A and next steps planning</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isFormValid}
            className="gap-2 bg-primary hover:bg-primary-hover transition-colors"
          >
            Schedule Meeting
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
