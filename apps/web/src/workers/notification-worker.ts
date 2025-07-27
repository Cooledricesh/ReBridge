#!/usr/bin/env node

import 'dotenv/config';
import { notificationWorker } from '@/lib/notifications/queue';
// import { startNotificationSchedulers } from '@/lib/notifications/scheduler';

console.log('🔔 Starting notification worker...');

// 워커 시작
notificationWorker.run();

// 스케줄러 시작
// startNotificationSchedulers();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await notificationWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await notificationWorker.close();
  process.exit(0);
});

console.log('✅ Notification worker is running');