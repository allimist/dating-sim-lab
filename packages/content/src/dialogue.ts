import type { Mood, Outcome, PlayerFactKey, Style } from './types';

type ByStyle = Record<Style, string[]>;

/** Values the player can claim about himself. Girls like/dislike some of them. */
export const PLAYER_FACT_VALUES: Record<PlayerFactKey, string[]> = {
  job: ['a pilot', 'a teacher', 'a software developer', 'a chef', 'a doctor', 'a firefighter', 'a musician'],
  hobby: ['surfing', 'chess', 'cooking', 'hiking', 'guitar', 'photography', 'gaming'],
  pet: ['a dog', 'a cat', 'a parrot', 'no pets'],
  city: ['Tel Aviv', 'Haifa', 'Jerusalem', 'Eilat', 'Jaffa'],
  music: ['rock', 'jazz', 'pop', 'hip-hop', 'classical'],
  food: ['sushi', 'pizza', 'hummus', 'Thai food', 'pasta'],
};

/** How a girl phrases a fact about him: "you were {v}". Used in callbacks and contradictions. */
export const FACT_PHRASE: Record<PlayerFactKey, string> = {
  job: 'you were {v}',
  hobby: 'you were into {v}',
  pet: 'you had {v}',
  city: 'you lived in {v}',
  music: 'you listened to {v}',
  food: 'your favourite food was {v}',
};

/** Present-tense version for the profile page: "She thinks {phrase}". */
export const PROFILE_PHRASE: Record<PlayerFactKey, string> = {
  job: 'you are {v}',
  hobby: 'you are into {v}',
  pet: 'you have {v}',
  city: 'you live in {v}',
  music: 'you listen to {v}',
  food: 'your favourite food is {v}',
};

export const HER_QUESTIONS: Record<PlayerFactKey, string[]> = {
  job: ['So what do you do for work?', 'Tell me, what do you do? Work-wise 😄'],
  hobby: ['What do you do for fun?', 'What is your thing? Like, your hobby?'],
  pet: ['Do you have any pets?', 'Important question: animals. Do you have any?'],
  city: ['Where do you live?', 'Which city are you in?'],
  music: ['What kind of music are you into?', 'What is playing in your headphones lately?'],
  food: ['What is your favourite food?', 'If you could eat one thing forever, what would it be?'],
};

export const HER_RECALL_QUESTIONS: Record<PlayerFactKey, string[]> = {
  job: ['Remind me, what do you do again?', 'Wait, what was your job again?'],
  hobby: ['What was your hobby again? I forgot 🙈'],
  pet: ['Remind me, do you have pets?'],
  city: ['Where did you say you live?'],
  music: ['What music were you into again?'],
  food: ['What was your favourite food again?'],
};

/** {v} = the value, {V} = capitalised. */
export const PLAYER_ANSWERS: Record<PlayerFactKey, Record<Style, string>> = {
  job: {
    nice: 'I\'m {v}. I really like it, especially the people. What about you?',
    charismatic: '{V}. Ask me anything about it — but I\'ll ask you twice as many questions back.',
    funny: 'I\'m {v}. Mostly it means I\'ve perfected looking busy 😄',
    flirty: 'I\'m {v}… but right now my favourite job is talking to you 😉',
    deep: 'I work as {v}. It taught me a lot about patience and what really matters.',
    confident: 'I\'m {v}, and honestly, I\'m one of the best at it.',
  },
  hobby: {
    nice: 'I love {v}. It\'s how I relax. Would you ever try it?',
    charismatic: '{V}! I could talk about it for hours — next time I\'ll show you why it\'s amazing.',
    funny: '{V}. I\'m not great at it, but I\'m extremely enthusiastic 😂',
    flirty: '{V}… though I\'d skip it in a heartbeat to hang out with you.',
    deep: '{V}. It\'s the one thing that clears my head completely.',
    confident: '{V}. I\'ve gotten pretty serious about it — people say I\'m really good.',
  },
  pet: {
    nice: 'I have {v}. Do you like animals?',
    charismatic: 'I have {v} — and trust me, there\'s a story behind that.',
    funny: 'I have {v}. Who\'s in charge at home is still up for debate 😅',
    flirty: 'I have {v}… and a lot of room on the couch 😉',
    deep: 'I have {v}. Honestly, it says a lot about how I like to live.',
    confident: 'I have {v}. Best decision I ever made.',
  },
  city: {
    nice: 'I live in {v}. It\'s a nice place — have you been?',
    charismatic: '{V}! I know all the hidden spots, I\'d love to show you.',
    funny: '{V}. The parking situation has made me a stronger person 😂',
    flirty: '{V}… but it would be a lot better with you in it 😉',
    deep: '{V}. It\'s where I finally felt at home.',
    confident: '{V}. Best city there is, no contest.',
  },
  music: {
    nice: 'Mostly {v}. What do you listen to?',
    charismatic: '{V}! I\'ll make you a playlist, you\'ll be hooked.',
    funny: '{V}. In the car I\'m a superstar. Outside the car, please don\'t ask 😄',
    flirty: '{V}… something we could dance to together 😉',
    deep: '{V}. Certain songs get me through hard days.',
    confident: '{V}. I have excellent taste, just saying.',
  },
  food: {
    nice: '{V}, definitely. What\'s your favourite?',
    charismatic: '{V}! I know a place that will change your life, I\'ll take you.',
    funny: '{V}. I\'d marry it if it were legal 😂',
    flirty: '{V}… over dinner with you would be perfect 😉',
    deep: '{V}. It reminds me of home and family dinners.',
    confident: '{V}. And I make it better than any restaurant.',
  },
};

/** Her opener that calls back something he told HER (only her own memory). */
export const CALLBACK_OPENERS: Record<PlayerFactKey, string[]> = {
  job: ['Hey! How was work? Life as {v} treating you well?'],
  hobby: ['Hey you! Been doing any {v} lately?'],
  pet: ['Hi! How is your {n} doing? 🐾'],
  city: ['Hey! What\'s new in {v}?'],
  music: ['Hi! Heard any good {v} lately? 🎶'],
  food: ['Hey! I had {v} today and thought of you 😄'],
};

export const FIRST_OPENERS: Record<Mood, string[]> = {
  happy: ['Hi! So we matched 😊 I\'m {name}.', 'Hey there! {name} here 😊 nice to meet you.'],
  sad: ['Hi… sorry, I\'m {name}. Not the best day, but hi.', 'Hey. I\'m {name}. Kind of a rough day, sorry if I\'m quiet.'],
  bored: ['Hi, I\'m {name}. I\'m soooo bored. Entertain me? 😅'],
  stressed: ['Hi, I\'m {name}! Crazy day, but I wanted to say hi.'],
  excited: ['Hi!! I\'m {name}! Sorry, I\'m super hyped today 😄'],
};

export const OPENERS: Record<Mood, { cold: string[]; warm: string[] }> = {
  happy: {
    cold: ['Hey.', 'Hi, what\'s up?'],
    warm: ['Hey you! 😊', 'There you are! I was hoping you\'d message 😊'],
  },
  sad: {
    cold: ['Hi. Not the best day.', 'Hey… I\'m kind of down today.'],
    warm: ['Hey… I\'m really glad you\'re here. Today is hard.', 'Hi. Honestly I needed someone to talk to today.'],
  },
  bored: {
    cold: ['Hi. Bored.', 'Hey. Nothing going on today.'],
    warm: ['Hiii! I\'m so bored, save me 😅', 'Finally! Entertain me please 😄'],
  },
  stressed: {
    cold: ['Hi. Busy day, I don\'t have much time.', 'Hey. Lots going on.'],
    warm: ['Hey… crazy day, but I wanted to talk to you.', 'Hi! I\'m drowning in stuff today but hi 😮‍💨'],
  },
  excited: {
    cold: ['Hi! Good day today.', 'Hey! I\'m in a great mood.'],
    warm: ['Oh my god hi! I have the best news!', 'Heyyy! Today is amazing and you\'re here too 😄'],
  },
};

export const GREETING_REPLIES: Record<Mood, Record<Style, string>> = {
  happy: {
    nice: 'Hey! You sound happy, I love that. How\'s your day going?',
    charismatic: 'There she is! Your good mood is contagious — tell me everything.',
    funny: 'Hi! Quick, tell me your secret before the good mood wears off 😄',
    flirty: 'Hey beautiful 😉 that smile reaches me through the screen.',
    deep: 'Hey. You seem really light today — what\'s making you happy?',
    confident: 'Hey. Glad you messaged, I was about to text you anyway.',
  },
  sad: {
    nice: 'Oh no, I\'m sorry. Do you want to talk about it? I\'m here.',
    charismatic: 'Hey, chin up! Let\'s turn this day around together.',
    funny: 'Want me to tell you a terrible joke? I have a lot of them 😅',
    flirty: 'Aw, a pretty girl shouldn\'t be sad 😉 What can I do?',
    deep: 'Hey. No need to pretend with me. What happened?',
    confident: 'Don\'t let it get to you. Tomorrow will be better, trust me.',
  },
  bored: {
    nice: 'Aw, sorry you\'re bored. How\'s your day been?',
    charismatic: 'Bored? Challenge accepted. Two truths and a lie, go!',
    funny: 'Bored? I\'m basically a professional entertainer. Unpaid. 😄',
    flirty: 'Bored? Then let me be the most interesting part of your day 😉',
    deep: 'Boredom is underrated — sometimes it means you need a change. What would you rather be doing?',
    confident: 'You\'re talking to me now, so the boring part is over.',
  },
  stressed: {
    nice: 'No worries, take your time. Anything I can do to help?',
    charismatic: 'Okay, crisis manager here. What\'s the biggest thing on your plate?',
    funny: 'Deep breaths. Or panic, I support both equally 😄',
    flirty: 'Stressed looks good on you too 😉',
    deep: 'That sounds heavy. What\'s weighing on you the most?',
    confident: 'Just handle the important stuff first. You\'ll be fine.',
  },
  excited: {
    nice: 'Yay! I\'m so happy for you, tell me!',
    charismatic: 'Oh, I need to hear this — spill it, right now!',
    funny: 'Drumroll please… 🥁😄',
    flirty: 'Your excitement is cute 😉 What\'s the news?',
    deep: 'I love seeing you like this. What happened?',
    confident: 'Called it. I knew today would be a good day for you.',
  },
};

/** What she shares when her mood, not a personal fact, is the story of the day. */
export const MOOD_SHARES: Record<Mood, string[]> = {
  happy: ['I had the nicest day. Sun, coffee, no problems 😊'],
  sad: ['My grandma is in the hospital and I can\'t stop thinking about it.', 'I got some bad news today and I just feel… heavy.', 'A friend I trusted said some really hurtful things today.'],
  bored: ['Nothing happened today. Literally nothing 😩', 'I have reorganised my sock drawer twice. Send help.'],
  stressed: ['Work is crushing me this week. I don\'t know how I\'ll finish everything.', 'My landlord wants to raise the rent and I\'m freaking out.'],
  excited: ['I got the thing I applied for! I can\'t believe it!', 'I just booked a weekend trip, I\'m so excited!'],
};

export type ShareKind = 'good' | 'bad' | 'bored';

export const SHARE_RESPONSES: Record<ShareKind, Record<Style, string>> = {
  good: {
    nice: 'That\'s really lovely. Thanks for telling me 😊',
    charismatic: 'Okay, that\'s awesome. I want the full story next time!',
    funny: 'That\'s amazing. I\'m officially jealous 😄',
    flirty: 'You get more interesting every time we talk 😉',
    deep: 'That\'s beautiful. What does it mean to you?',
    confident: 'Nice. Sounds like we have more in common than you think.',
  },
  bad: {
    nice: 'I\'m so sorry. That\'s a lot to carry. I\'m here if you need me.',
    charismatic: 'Hey, you\'ve got this. Let\'s figure out what would make tomorrow better.',
    funny: 'That\'s awful. Want pictures of ducks? It helps, scientifically 🦆',
    flirty: 'Forget all that, think about me instead 😉',
    deep: 'That sounds really hard. How are you holding up, honestly?',
    confident: 'Don\'t overthink it. These things always work out.',
  },
  bored: {
    nice: 'Aw. Well, I\'m glad you\'re talking to me at least.',
    charismatic: 'Then let\'s plan something fun. If you could be anywhere right now, where?',
    funny: 'I once watched paint dry for a living. Kidding. Mostly 😄',
    flirty: 'Then let me make your evening a little more exciting 😉',
    deep: 'Quiet days are good for thinking. What\'s on your mind?',
    confident: 'Stick with me, boring days won\'t be a problem.',
  },
};

export const ABOUT_PROMPTS = {
  up: ['So, tell me something 😊', 'Your turn — ask me anything.', 'Okay, enough about me 😄'],
  down: ['Can we talk about something else for a bit?', 'Ask me something. Anything. I need a distraction.'],
};

export const ASK_HER: ByStyle = {
  nice: ['How was your day, really?', 'Is there anything I can do to make your week easier?'],
  charismatic: ['Tell me something nobody knows about you.', 'If we went on an adventure tomorrow, where would you pick?'],
  funny: ['Important question: pineapple on pizza, yes or no? 🍍', 'Rate your day from 1 to "I need a nap" 😄'],
  flirty: ['So… when do I get to see you in person? 😉', 'Has anyone told you today that you\'re gorgeous?'],
  deep: ['What\'s something you\'re really looking forward to?', 'What made you who you are today?'],
  confident: ['I bet I can guess your favourite movie. Want to test me?', 'Let me plan our first date. You won\'t regret it.'],
};

export const BIRTHDAY_PROMPTS = ['Guess what day it is today? 🎂', 'Psst… today is a special day 🎈'];
export const BIRTHDAY_GIFT = 'Happy birthday! 🎂 I got you {gift}.';
export const BIRTHDAY_GENERIC = 'Happy birthday!! 🎉 I hope today is amazing.';
export const GIFT_LOVED = ['{Gift}?! You remembered! That\'s my favourite 🥹', 'No way, {gift}! You actually listened 💛'];
export const GIFT_WRONG = ['Oh… thanks. I don\'t really like {gift} though 😅', '{Gift}? Hm. Did you buy that for someone else? 🤨'];

export const DECOY_REACTIONS = ['{Thing}? I don\'t know what you\'re talking about… are you mixing me up with someone? 🤨', 'Wait. {Thing}?? That\'s not me. Who are you thinking of? 😒'];

export const CONTRADICTION_REACTIONS = ['Wait… last time {phrase}. Now it\'s {new}? 🤨', 'Hold on. You told me {phrase}. Which one is it?', 'Hmm, that\'s not what you said before. You said {phrase}. 🤔'];
export const CONSISTENT_PREFIX = ['Right, you told me! ', 'I remember! ', 'Yes, I know 😊 '];

export const LIKED_TOPIC = ['Oh I love {n}! ', 'No way, {n}? Me too! '];
export const DISLIKED_TOPIC = ['Hmm, {n}… not really my thing. ', '{N}? Ugh. Okay. '];

export const CLOSING_PROMPTS = {
  good: ['I should go soon… this was really nice though 😊', 'Okay, I have to run. I liked this.'],
  ok: ['Okay, I have to go soon.', 'I should get going.'],
  bad: ['I think I\'m going to go now.', 'Yeah… I have to go.'],
};

export const CLOSING_REPLIES: Record<Style, string> = {
  nice: 'Thanks for talking with me. Have a great night 😊',
  charismatic: 'This was fun. Same time tomorrow? I\'ll bring better jokes.',
  funny: 'Go, go! Before I run out of material 😄',
  flirty: 'Sweet dreams… of me, hopefully 😉',
  deep: 'I really liked getting to know you better today.',
  confident: 'Talk tomorrow. I know you\'ll be thinking about me.',
};

export const GOODBYES = {
  great: ['Night! Can\'t wait to talk tomorrow 💛', 'Byeee 😊 text me tomorrow, okay?'],
  good: ['Bye! 😊', 'Talk soon 🙂'],
  meh: ['Bye.', 'Okay, bye.'],
  bad: ['…Bye.', 'Yeah. Bye.'],
  blocked: ['Please don\'t message me again.', 'I\'m done. Don\'t write to me.'],
};

export const REACTIONS: Record<Outcome, string[]> = {
  loved: ['Haha, I love that! 😄', 'Okay, you\'re kind of amazing.', 'That\'s exactly what I needed to hear 💛', 'You always know what to say 😊'],
  liked: ['Haha, nice 😊', 'Aw, that\'s sweet.', 'I like that.', 'Okay, okay, I see you 😄'],
  neutral: ['Haha, okay.', 'Mm, I see.', 'Fair enough.', 'Ok 🙂'],
  annoyed: ['Hmm. Okay…', 'That\'s… a bit much.', 'Not sure how to answer that.', 'Right. 😐'],
  offended: ['Wow. Seriously?', 'That\'s really not okay.', 'I don\'t think you get me at all.', 'Excuse me?? 😠'],
};

/** Reactions that explain WHY a style landed. Key: `${outcomeGroup}:${style}:${mood|'*'}`. */
export const STYLE_REACTIONS: Record<string, string[]> = {
  'bad:flirty:*': ['Slow down, we barely know each other.', 'Can we not? 😒'],
  'bad:flirty:sad': ['Seriously? I tell you I\'m sad and you flirt?', 'Not now. Please.'],
  'bad:funny:sad': ['I\'m really not in the mood for jokes right now.', 'Haha… no. Not today.'],
  'bad:confident:*': ['A little full of yourself, aren\'t you?', 'Wow, humble too 🙄'],
  'bad:confident:sad': ['It\'s not that simple. You don\'t get it.'],
  'bad:charismatic:sad': ['I don\'t need a pep talk. I need someone to listen.'],
  'bad:deep:bored': ['Okay, that\'s heavy… I just wanted to have fun 😅'],
  'bad:deep:excited': ['Whoa, deep. I just wanted to celebrate 😅'],
  'bad:nice:bored': ['You\'re sweet, but that\'s kind of boring 😅'],
  'bad:nice:*': ['That\'s… nice, I guess. A bit plain.'],
  'good:deep:sad': ['Thank you for actually listening. It means a lot 💛', 'You\'re the first person today who asked. Thank you.'],
  'good:nice:stressed': ['Thank you… I really needed some kindness today.', 'That helps more than you know.'],
  'good:funny:bored': ['HAHA okay that\'s actually funny 😂', 'Okay you got me, I laughed out loud 😂'],
  'good:charismatic:excited': ['Yes! Finally someone as hyped as me! 🎉'],
  'good:charismatic:bored': ['Ooh, okay, I like this energy!'],
  'good:flirty:*': ['Stop it 🙈 …okay, don\'t stop.', 'Smooth 😏'],
  'good:confident:*': ['I like a man who knows what he wants.'],
};

export const BLOCKED_REFUSALS = ['She doesn\'t want to talk to you.', 'Your message was left on read.'];
export const APOLOGY_TEXT = 'I\'m really sorry about how I acted. You didn\'t deserve that. Can we start over?';
export const APOLOGY_ACCEPTED = ['…Okay. One more chance. Don\'t make me regret it.', 'Fine. Let\'s try again. Slowly.'];
export const APOLOGY_REJECTED = ['I said I don\'t want to talk.', 'Sorry doesn\'t fix everything.'];
