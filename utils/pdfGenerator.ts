// utils/pdfGenerator.ts
// Canvas-based resume image generator for sharing/download

import { UserProfile } from '../types';

interface ResumeData {
  user: UserProfile;
  cognitiveSkills: { code: string; title: string; score: number }[];
  bigFiveData: { title: string; score: number }[];
  careerProfiles: { title: string; fitScore: number }[];
  date: string;
}

export async function generateResumeImage(data: ResumeData): Promise<Blob> {
  const WIDTH = 1200;
  const HEIGHT = 1700;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // === Background ===
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Gradient overlay
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  grad.addColorStop(0, 'rgba(79, 70, 229, 0.15)');
  grad.addColorStop(1, 'rgba(139, 92, 246, 0.1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Decorative circles
  ctx.beginPath();
  ctx.arc(WIDTH - 100, 100, 200, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(100, HEIGHT - 200, 150, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(139, 92, 246, 0.06)';
  ctx.fill();

  // Helper: draw rounded rect
  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // === HEADER SECTION ===
  // Logo box
  roundRect(60, 50, 80, 80, 16);
  ctx.fillStyle = '#4f46e5';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('iC', 100, 102);

  // Title (RTL)
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px Tahoma, sans-serif';
  ctx.fillText('کارنامه شایستگی حرفه‌ای', WIDTH - 60, 85);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px Tahoma, sans-serif';
  ctx.fillText(`${data.user.name} | ${data.date}`, WIDTH - 60, 120);

  // Verified badge
  roundRect(WIDTH - 260, 135, 200, 34, 17);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 14px Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓ تأیید شده (Verified)', WIDTH - 160, 157);

  // === COGNITIVE SKILLS SECTION ===
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 28px Tahoma, sans-serif';
  ctx.fillText('شاخص‌های شناختی (مدل رضی)', WIDTH - 60, 230);

  // Skill bars
  const barStartY = 270;
  const barHeight = 18;
  const barGap = 52;
  const barMaxWidth = 500;
  const barX = 380;

  const skillColors = ['#ec4899', '#3b82f6', '#f59e0b', '#6366f1', '#10b981', '#ef4444', '#a855f7'];

  data.cognitiveSkills.forEach((skill, idx) => {
    const y = barStartY + idx * barGap;

    // Label (RTL)
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 16px Tahoma, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(skill.title, WIDTH - 60, y + 24);

    // Code
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(skill.code, 60, y + 24);

    // Bar background
    roundRect(barX, y + 8, barMaxWidth, barHeight, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();

    // Bar fill
    const fillWidth = Math.max(0, (skill.score / 100) * barMaxWidth);
    if (fillWidth > 0) {
      roundRect(barX, y + 8, fillWidth, barHeight, 9);
      ctx.fillStyle = skillColors[idx % skillColors.length];
      ctx.fill();
    }

    // Score text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${skill.score}%`, barX + barMaxWidth + 20, y + 24);
  });

  // === BIG FIVE SECTION ===
  if (data.bigFiveData.length > 0) {
    const b5Y = barStartY + 7 * barGap + 40;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px Tahoma, sans-serif';
    ctx.fillText('پروفایل شخصیت (OCEAN)', WIDTH - 60, b5Y);

    const b5Colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#a855f7'];
    const b5BoxWidth = (WIDTH - 120 - 40) / 5;

    data.bigFiveData.forEach((trait, idx) => {
      const bx = 60 + idx * (b5BoxWidth + 10);
      const by = b5Y + 30;

      // Box
      roundRect(bx, by, b5BoxWidth - 10, 120, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Score
      ctx.fillStyle = b5Colors[idx];
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${trait.score}%`, bx + (b5BoxWidth - 10) / 2, by + 55);

      // Label - extract short name
      const shortTitle = trait.title.split('(')[0].trim();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 13px Tahoma, sans-serif';
      ctx.fillText(shortTitle, bx + (b5BoxWidth - 10) / 2, by + 90);
    });
  }

  // === CAREER FIT SECTION ===
  if (data.careerProfiles.length > 0) {
    const cfY = data.bigFiveData.length > 0 ? barStartY + 7 * barGap + 220 : barStartY + 7 * barGap + 60;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px Tahoma, sans-serif';
    ctx.fillText('تحلیل تناسب شغلی', WIDTH - 60, cfY);

    // Best fit highlight box
    roundRect(60, cfY + 20, WIDTH - 120, 110, 20);
    const cfGrad = ctx.createLinearGradient(60, cfY + 20, WIDTH - 60, cfY + 130);
    cfGrad.addColorStop(0, 'rgba(79, 70, 229, 0.3)');
    cfGrad.addColorStop(1, 'rgba(139, 92, 246, 0.1)');
    ctx.fillStyle = cfGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 14px Tahoma, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('پیشنهاد برتر:', WIDTH - 90, cfY + 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Tahoma, sans-serif';
    ctx.fillText(data.careerProfiles[0].title, WIDTH - 90, cfY + 90);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${data.careerProfiles[0].fitScore}%`, 100, cfY + 82);

    // Other career profiles
    const otherStartY = cfY + 150;
    data.careerProfiles.slice(1, 4).forEach((profile, idx) => {
      const py = otherStartY + idx * 42;

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 15px Tahoma, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(profile.title, WIDTH - 90, py + 20);

      // Mini bar
      roundRect(barX, py + 8, 300, 12, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fill();

      const pFill = Math.max(0, (profile.fitScore / 100) * 300);
      if (pFill > 0) {
        roundRect(barX, py + 8, pFill, 12, 6);
        ctx.fillStyle = idx === 0 ? '#6366f1' : '#475569';
        ctx.fill();
      }

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${profile.fitScore}%`, barX + 310, py + 20);
    });
  }

  // === FOOTER ===
  // Separator line
  roundRect(100, HEIGHT - 100, WIDTH - 200, 1, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fill();

  ctx.fillStyle = '#475569';
  ctx.font = '14px Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('iCompetency — سامانه جامع سنجش صلاحیت حرفه‌ای | icompetency.ir', WIDTH / 2, HEIGHT - 60);

  ctx.fillStyle = '#334155';
  ctx.font = '12px monospace';
  ctx.fillText('This report is auto-generated and verified by iCompetency AI Engine', WIDTH / 2, HEIGHT - 35);

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image'));
      },
      'image/png',
      1.0
    );
  });
}

export async function shareResume(data: ResumeData): Promise<void> {
  const blob = await generateResumeImage(data);
  const file = new File([blob], `iCompetency-Resume-${data.user.name}.png`, {
    type: 'image/png',
  });

  // Try Web Share API with file (mobile)
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `کارنامه شایستگی ${data.user.name}`,
        text: `کارنامه شایستگی حرفه‌ای در پلتفرم iCompetency`,
        files: [file],
      });
      return;
    } catch (err) {
      // User cancelled or share failed, fall through to download
      if ((err as DOMException)?.name === 'AbortError') return;
    }
  }

  // Fallback: download the image
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `iCompetency-Resume-${data.user.name}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
