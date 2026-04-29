import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useEscapeKey from '../../hooks/useEscapeKey';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function DatePicker({ value, onChange, placeholder = "Select Date" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewDate, setViewDate] = useState(new Date()); // For navigation
  const containerRef = useRef(null);

  useEscapeKey(isOpen, () => setIsOpen(false));

  // Initialize state from value
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        // Adjust for timezone offset to display correct date
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
        setSelectedDate(adjustedDate);
        setViewDate(adjustedDate);
      }
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const handleOk = () => {
    if (selectedDate) {
      // Format as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    } else {
        onChange('');
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
    // Reset view to selected date if exists
    if (selectedDate) {
        setViewDate(selectedDate);
    }
  };

  const changeMonth = (delta) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };

  const changeYear = (delta) => {
    setViewDate(new Date(viewDate.getFullYear() + delta, viewDate.getMonth(), 1));
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }
    
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate && 
        selectedDate.getDate() === day && 
        selectedDate.getMonth() === month && 
        selectedDate.getFullYear() === year;
        
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
            ${isSelected 
              ? 'bg-neon-blue text-dark-bg font-bold' 
              : 'text-gray-300 hover:bg-white/10'
            }
          `}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Input Field */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 cursor-pointer flex items-center justify-between hover:border-gray-600 transition-colors"
      >
        <span className={value ? 'text-white' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>

      {/* Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute z-50 mt-2 p-4 bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl w-[320px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-2">
              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <span className="text-white font-medium w-16 text-center">{SHORT_MONTH_NAMES[viewDate.getMonth()]}</span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-2">
                <button onClick={() => changeYear(-1)} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <span className="text-white font-medium">{viewDate.getFullYear()}</span>
                <button onClick={() => changeYear(1)} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 mb-2 text-center">
              {DAYS.map((day, i) => (
                <div key={i} className="text-xs text-gray-500 font-medium py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-1 justify-items-center mb-4">
              {renderCalendar()}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <button 
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm text-neon-blue hover:bg-neon-blue/10 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleOk}
                className="px-3 py-1.5 text-sm text-neon-blue font-medium hover:bg-neon-blue/10 rounded transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
