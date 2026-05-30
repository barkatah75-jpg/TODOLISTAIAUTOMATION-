import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = process.env.EMAIL_FROM || 'AIVANA Kids OS <noreply@aivana.app>'

export async function sendWelcomeEmail(to: string, name: string, role: 'child' | 'parent') {
  const subject = role === 'child'
    ? `Welcome to AIVANA, ${name}! Your adventure starts now 🚀`
    : `Welcome to AIVANA Parent Hub, ${name}! 👨‍👩‍👧`

  const html = role === 'child' ? `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#7C3AED;font-size:28px;font-weight:900;margin-bottom:8px">Welcome, ${name}! 🌟</h1>
      <p style="color:#6B7280;font-size:15px;line-height:1.6">Your AIVANA adventure has officially begun! Here's what you can do:</p>
      <div style="background:#F5F3FF;border-radius:16px;padding:20px;margin:20px 0">
        <p style="margin:8px 0">🤖 <strong>Chat with AIVA</strong> — Your AI homework helper</p>
        <p style="margin:8px 0">⚡ <strong>Earn XP</strong> — Complete tasks and level up</p>
        <p style="margin:8px 0">🔥 <strong>Build streaks</strong> — Do tasks every day for bonus rewards</p>
        <p style="margin:8px 0">🎨 <strong>Draw & Create</strong> — Save your artwork forever</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/child/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#9333EA);color:white;text-decoration:none;padding:14px 28px;border-radius:14px;font-weight:700;font-size:15px">
        Go to My Dashboard 🚀
      </a>
      <p style="color:#9CA3AF;font-size:12px;margin-top:24px">Questions? Reply to this email or contact support@aivana.app</p>
    </div>
  ` : `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#7C3AED;font-size:28px;font-weight:900;margin-bottom:8px">Welcome, ${name}! 👨‍👩‍👧</h1>
      <p style="color:#6B7280;font-size:15px;line-height:1.6">Your AIVANA Parent Hub is ready. Here's what you can do:</p>
      <div style="background:#F5F3FF;border-radius:16px;padding:20px;margin:20px 0">
        <p style="margin:8px 0">📊 <strong>Track progress</strong> — See daily task completion charts</p>
        <p style="margin:8px 0">📋 <strong>Assign tasks</strong> — Give homework and chores with XP rewards</p>
        <p style="margin:8px 0">✅ <strong>Approve rewards</strong> — Celebrate your child's achievements</p>
        <p style="margin:8px 0">🎁 <strong>Create rewards</strong> — Define real-world prizes kids can unlock</p>
      </div>
      <div style="background:#FFF7ED;border:1px solid#FED7AA;border-radius:12px;padding:16px;margin:16px 0">
        <p style="margin:0;font-size:13px;color:#92400E"><strong>Next step:</strong> Ask your child to register at <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/register" style="color:#7C3AED">aivana.app/auth/register</a> and link their account to yours.</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/parent/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#9333EA);color:white;text-decoration:none;padding:14px 28px;border-radius:14px;font-weight:700;font-size:15px">
        Open Parent Dashboard 📊
      </a>
    </div>
  `

  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('Email send failed:', err)
  }
}

export async function sendStreakBreakWarning(to: string, name: string, streakDays: number) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `⚠️ ${name}'s ${streakDays}-day streak is in danger!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#F59E0B">⚠️ Streak alert for ${name}</h2>
        <p>${name} hasn't completed any tasks today. Their <strong>${streakDays}-day streak</strong> will reset at midnight!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/child/todos" style="display:inline-block;background:#7C3AED;color:white;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:700">
          Complete a Task Now 🔥
        </a>
      </div>
    `,
  })
}

export async function sendRewardRedeemed(
  parentEmail: string,
  childName: string,
  rewardTitle: string,
  rewardIcon: string
) {
  await resend.emails.send({
    from: FROM,
    to: parentEmail,
    subject: `🎁 ${childName} redeemed a reward!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#7C3AED">🎁 Reward Redeemed!</h2>
        <p><strong>${childName}</strong> redeemed: <strong>${rewardIcon} ${rewardTitle}</strong></p>
        <p>Log in to your parent dashboard to approve and deliver this reward.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/parent/rewards" style="display:inline-block;background:#7C3AED;color:white;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:700">
          View Rewards Dashboard
        </a>
      </div>
    `,
  })
}

export async function sendWeeklyReport(
  parentEmail: string,
  parentName: string,
  childName: string,
  stats: { tasksCompleted: number; xpEarned: number; streakDays: number; level: number }
) {
  await resend.emails.send({
    from: FROM,
    to: parentEmail,
    subject: `📊 ${childName}'s weekly report — ${stats.tasksCompleted} tasks completed!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#7C3AED">Weekly Report for ${childName} 📊</h2>
        <p>Hi ${parentName}, here's how ${childName} did this week:</p>
        <div style="background:#F5F3FF;border-radius:16px;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0">
          <div style="text-align:center"><div style="font-size:28px;font-weight:900;color:#7C3AED">${stats.tasksCompleted}</div><div style="color:#6B7280;font-size:12px">Tasks Done</div></div>
          <div style="text-align:center"><div style="font-size:28px;font-weight:900;color:#F59E0B">${stats.xpEarned}</div><div style="color:#6B7280;font-size:12px">XP Earned</div></div>
          <div style="text-align:center"><div style="font-size:28px;font-weight:900;color:#EF4444">${stats.streakDays}🔥</div><div style="color:#6B7280;font-size:12px">Streak</div></div>
          <div style="text-align:center"><div style="font-size:28px;font-weight:900;color:#10B981">Lv.${stats.level}</div><div style="color:#6B7280;font-size:12px">Level</div></div>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/parent/analytics" style="display:inline-block;background:#7C3AED;color:white;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:700">
          View Full Analytics →
        </a>
      </div>
    `,
  })
}

export async function sendPaymentSuccessEmail(
  to: string,
  name: string,
  planKey: string,
) {
  const planNames: Record<string, string> = {
    pro_monthly: 'Pro Monthly',
    pro_yearly: 'Pro Yearly',
    family_monthly: 'Family Monthly',
    family_yearly: 'Family Yearly',
  }
  const planName = planNames[planKey] || planKey

  return resend.emails.send({
    from: FROM,
    to,
    subject: `🎉 Welcome to AIVANA ${planName}!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h1 style="color:#7C3AED">You're now AIVANA ${planName}! 🚀</h1>
        <p>Hi ${name}, payment successful!</p>
        <div style="background:linear-gradient(135deg,#7C3AED,#EC4899);border-radius:16px;padding:20px;color:white;margin:16px 0">
          <div style="font-size:32px;margin-bottom:8px">✨</div>
          <p style="font-weight:700;font-size:18px;margin:0">All premium features unlocked!</p>
          <ul style="margin:12px 0 0;padding-left:20px">
            <li>Unlimited tasks &amp; AI chats</li>
            <li>Adaptive learning engine</li>
            <li>AI story generator</li>
            <li>Advanced parent controls</li>
          </ul>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/parent/dashboard" style="display:inline-block;background:#7C3AED;color:white;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:700">
          Go to Dashboard →
        </a>
        <p style="color:#6B7280;font-size:12px;margin-top:20px">Questions? Reply to this email or contact support@aivana.app</p>
      </div>
    `,
  })
}
