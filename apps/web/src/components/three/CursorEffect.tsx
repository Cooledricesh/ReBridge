'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function CursorEffect() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorFollowerRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const follower = cursorFollowerRef.current;
    const dot = cursorDotRef.current;
    
    if (!cursor || !follower || !dot) return;

    let mouse = { x: 0, y: 0 };
    let cursorPos = { x: 0, y: 0 };
    let followerPos = { x: 0, y: 0 };

    // Update mouse position
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    // Interactive elements
    const handleMouseEnter = () => {
      gsap.to(cursor, {
        scale: 1.5,
        borderColor: 'rgba(99, 102, 241, 0.5)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        duration: 0.3,
      });
      gsap.to(follower, {
        scale: 0.8,
        borderWidth: 3,
        duration: 0.3,
      });
    };

    const handleMouseLeave = () => {
      gsap.to(cursor, {
        scale: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
        backgroundColor: 'transparent',
        duration: 0.3,
      });
      gsap.to(follower, {
        scale: 1,
        borderWidth: 2,
        duration: 0.3,
      });
    };

    // Hide default cursor
    document.body.style.cursor = 'none';

    // Add event listeners to interactive elements
    const interactiveElements = document.querySelectorAll('a, button, input, textarea, select, [role="button"]');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    // Animation loop
    const animate = () => {
      // Smooth cursor movement
      cursorPos.x += (mouse.x - cursorPos.x) * 0.15;
      cursorPos.y += (mouse.y - cursorPos.y) * 0.15;
      
      followerPos.x += (mouse.x - followerPos.x) * 0.08;
      followerPos.y += (mouse.y - followerPos.y) * 0.08;

      cursor.style.transform = `translate(${cursorPos.x}px, ${cursorPos.y}px)`;
      follower.style.transform = `translate(${followerPos.x}px, ${followerPos.y}px)`;
      dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;

      requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animate();

    // Handle cursor visibility
    const handleMouseEnterWindow = () => {
      gsap.to([cursor, follower, dot], {
        opacity: 1,
        duration: 0.3,
      });
    };

    const handleMouseLeaveWindow = () => {
      gsap.to([cursor, follower, dot], {
        opacity: 0,
        duration: 0.3,
      });
    };

    document.addEventListener('mouseenter', handleMouseEnterWindow);
    document.addEventListener('mouseleave', handleMouseLeaveWindow);

    // Cleanup
    return () => {
      document.body.style.cursor = 'auto';
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnterWindow);
      document.removeEventListener('mouseleave', handleMouseLeaveWindow);
      
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  return (
    <>
      <div
        ref={cursorDotRef}
        className="fixed w-1 h-1 bg-primary rounded-full pointer-events-none mix-blend-difference"
        style={{
          zIndex: 10000,
          left: '-2px',
          top: '-2px',
        }}
      />
      <div
        ref={cursorRef}
        className="fixed w-8 h-8 border-2 border-primary/30 rounded-full pointer-events-none mix-blend-difference"
        style={{
          zIndex: 9999,
          left: '-16px',
          top: '-16px',
          transition: 'border-color 0.3s, background-color 0.3s, transform 0.1s',
        }}
      />
      <div
        ref={cursorFollowerRef}
        className="fixed w-12 h-12 border-2 border-primary/20 rounded-full pointer-events-none mix-blend-difference"
        style={{
          zIndex: 9998,
          left: '-24px',
          top: '-24px',
          transition: 'border-width 0.3s, transform 0.1s',
        }}
      />
    </>
  );
}