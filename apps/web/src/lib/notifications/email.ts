import nodemailer from 'nodemailer';
import { EmailNotification } from '@rebridge/shared';

// 이메일 트랜스포터 생성
const createTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    console.warn('Email configuration is missing. Email notifications will be disabled.');
    return null;
  }
  
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: parseInt(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
};

let transporter: nodemailer.Transporter | null = null;

// 이메일 발송 함수
export async function sendEmail(notification: EmailNotification): Promise<void> {
  // 개발 환경에서는 콘솔에만 출력
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    console.log('📧 Email notification (dev mode):');
    console.log('To:', notification.to);
    console.log('Subject:', notification.subject);
    console.log('---');
    return;
  }
  
  if (!transporter) {
    transporter = createTransporter();
  }
  
  if (!transporter) {
    console.error('Email transporter not configured');
    return;
  }
  
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"ReBridge" <noreply@rebridge.kr>',
      to: notification.to,
      subject: notification.subject,
      html: notification.html,
      text: notification.text || htmlToText(notification.html),
    });
    
    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// HTML을 텍스트로 변환하는 간단한 함수
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 이메일 템플릿 헬퍼 함수
export function createEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReBridge</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background-color: #3B82F6;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">ReBridge</h1>
              <p style="margin: 10px 0 0 0; color: #E0E7FF; font-size: 16px;">
                정신질환 경험 당사자를 위한 맞춤형 구인 정보 플랫폼
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f8f8; text-align: center; font-size: 14px; color: #666;">
              <p style="margin: 0 0 10px 0;">
                © 2025 ReBridge. All rights reserved.
              </p>
              <p style="margin: 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #3B82F6; text-decoration: none;">
                  웹사이트 방문
                </a>
                |
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="color: #3B82F6; text-decoration: none;">
                  알림 설정
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}