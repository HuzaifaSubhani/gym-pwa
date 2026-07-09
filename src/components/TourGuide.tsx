"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function TourGuide() {
  useEffect(() => {
    // Only run tour once per browser
    if (localStorage.getItem("tourCompleted")) return;

    // Small delay to allow components to mount
    const timer = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        steps: [
          { 
            popover: { 
              title: 'Welcome to IronCore! 🏋️', 
              description: 'Let me give you a quick tour of your new gamified fitness tracker.' 
            } 
          },
          { 
            element: '#tour-day-selector', 
            popover: { 
              title: 'Your Schedule', 
              description: 'Here you can select the day of the week. The app automatically jumps to today.',
              side: "bottom", 
              align: 'start' 
            } 
          },
          { 
            element: '#tour-edit-routine', 
            popover: { 
              title: 'Custom Workouts', 
              description: 'Want to build your own day? Click here to wipe the pre-built routine and start fresh!',
              side: "bottom", 
              align: 'start' 
            } 
          },
          { 
            element: '#tour-exercise-card', 
            popover: { 
              title: 'Log Your Sets', 
              description: 'Fill in weight and reps. Once a card is fully filled, it glows green so you know it’s complete!',
              side: "top", 
              align: 'start' 
            } 
          },
          { 
            popover: { 
              title: 'Earn XP and Level Up 🎮', 
              description: 'Logging volume grants you XP. Heavier lifts = more XP. Climb the leaderboard and reach Level 10!' 
            } 
          }
        ],
        onDestroyStarted: () => {
          driverObj.destroy();
        }
      });

      driverObj.drive();
      localStorage.setItem("tourCompleted", "true");
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return null; // Invisible component
}
