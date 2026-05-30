import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export type StoryGenre = 'adventure' | 'mystery' | 'fantasy' | 'space' | 'underwater' | 'dinosaur'

const GENRE_SETTINGS: Record<StoryGenre, string> = {
  adventure: 'a thrilling jungle expedition',
  mystery: 'a mysterious detective case in a magical town',
  fantasy: 'an enchanted kingdom with dragons and wizards',
  space: 'an epic journey across galaxies and planets',
  underwater: 'a deep-sea adventure with talking sea creatures',
  dinosaur: 'a prehistoric world full of amazing dinosaurs',
}

export interface GeneratedStory {
  title: string
  content: string
  wordCount: number
  coverEmoji: string
  genre: StoryGenre
}

export async function generatePersonalizedStory(
  heroName: string,
  achievement: string,
  level: number,
  xp: number,
  badges: string[],
  genre: StoryGenre = 'adventure'
): Promise<GeneratedStory> {
  const setting = GENRE_SETTINGS[genre]
  const badgeList = badges.slice(0, 3).join(', ') || 'bravery'

  const prompt = `Write a short, exciting children's story (ages 6-14) where the main character is named "${heroName}".

STORY CONTEXT:
- Setting: ${setting}
- Hero's real achievement to celebrate: ${achievement}
- Hero is Level ${level} with ${xp.toLocaleString()} XP in real life
- Special powers earned from badges: ${badgeList}
- The story should feel like a reward/celebration for the child

STORY RULES:
- Exactly 150-200 words
- Start with "Once upon a time" or a creative opening
- Include the hero's name at least 4 times
- Weave in their real achievement naturally (e.g., completing homework → finding a magic scroll)
- End with an exciting cliffhanger or triumphant moment
- Age-appropriate, no scary or violent content
- Use vivid, fun language that kids love
- Include 2-3 dramatic moments

OUTPUT FORMAT:
Return a JSON object with exactly these fields:
{
  "title": "Story title (exciting, 3-6 words)",
  "content": "Full story text here",
  "coverEmoji": "Single most relevant emoji"
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      title: parsed.title || `${heroName}'s Great Adventure`,
      content: parsed.content || `Once upon a time, ${heroName} went on an amazing adventure...`,
      wordCount: (parsed.content || '').split(' ').length,
      coverEmoji: parsed.coverEmoji || '📚',
      genre,
    }
  } catch {
    return {
      title: `${heroName}'s Amazing Adventure`,
      content: `Once upon a time, ${heroName} was the bravest explorer in the land. With ${xp} experience points earned through hard work and dedication, ${heroName} had become a true champion!`,
      wordCount: 30,
      coverEmoji: '🌟',
      genre,
    }
  }
}

export async function checkStoryMilestone(
  userId: string,
  totalXP: number,
  level: number
): Promise<{ shouldGenerate: boolean; milestone: string }> {
  // Generate stories at key milestones
  const milestones = [
    { xp: 100, msg: 'first 100 XP earned' },
    { xp: 500, msg: '500 XP champion' },
    { xp: 1000, msg: '1000 XP master' },
    { xp: 2500, msg: '2500 XP legend' },
    { xp: 5000, msg: '5000 XP superstar' },
  ]
  const levelMilestones = [5, 10, 15, 20, 25]

  // Check XP milestones
  const xpMilestone = milestones.find(m => totalXP >= m.xp && totalXP < m.xp + 50)
  if (xpMilestone) return { shouldGenerate: true, milestone: xpMilestone.msg }

  // Check level milestones
  if (levelMilestones.includes(level)) {
    return { shouldGenerate: true, milestone: `reaching Level ${level}` }
  }

  return { shouldGenerate: false, milestone: '' }
}
