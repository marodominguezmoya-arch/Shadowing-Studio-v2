// Contenu des plans de 4 semaines : phrases parlées, courtes, réutilisables (esprit « matrices » :
// une structure, plusieurs variantes). Écrit en anglais (langue source la mieux traduite par l'IA),
// traduit au moment de créer les listes dans la langue pratiquée, en registre oral.
//
// Chaque semaine = noyau d'autonomie (CORE, commun à tous) + bloc de la situation.
// Semaines : 1 se présenter · 2 agir et demander · 3 imprévus et questions · 4 parler avec naturel.

export const CORE = [
  [
    "Hi, nice to meet you.",
    "I'm learning your language.",
    "Sorry, I don't understand.",
    "Could you say that again, please?",
    "Could you speak a bit more slowly?",
    "What does that mean?",
    "How do you say that?",
    "I understand, but I can't answer yet.",
  ],
  [
    "I'd like a coffee, please.",
    "I need some help.",
    "Can you help me?",
    "I have to go now.",
    "Can I ask you a question?",
    "I don't know yet.",
    "Is that okay?",
    "No problem.",
  ],
  [
    "Where is it?",
    "How much is it?",
    "When does it start?",
    "Why not?",
    "I'm tired, but I want to come.",
    "If you want, we can go together.",
    "I'll call you when I get home.",
    "Actually, I think so too.",
  ],
  [
    "Really?",
    "Exactly.",
    "You're right.",
    "I'm not sure.",
    "Maybe, we'll see.",
    "That's great!",
    "Never mind.",
    "See you later!",
  ],
];

export const SITUATIONS = {
  // --- Travail ---------------------------------------------------------------
  'work.office': [
    ["Hi, I'm the new colleague.", "I work in the finance department.", "What do you do here?", "Nice to work with you.", "Where is the meeting room?", "Do you have a minute?", "I'll send you an email.", "Let's talk about it later.", "I'm working from home today.", "I start at nine and finish at six."],
    ["Can we schedule a meeting?", "Does Tuesday work for you?", "I can't make it on Friday.", "Let's start the meeting.", "Can you share your screen?", "What's the deadline?", "I'll finish it by tomorrow.", "I agree with you.", "I see it a bit differently.", "Let's move on to the next point."],
    ["Sorry, I'm a bit late.", "Could you explain that again?", "I'm not sure I understood the task.", "Who is in charge of this?", "I need more time for this.", "There's a problem with the file.", "My computer isn't working.", "Can you send me the document?", "Let me check and get back to you.", "I'll ask my manager."],
    ["How was your weekend?", "Shall we grab a coffee?", "Are you going to lunch?", "It's been a busy week.", "Good job on the presentation!", "Thanks for your help.", "Have a good evening!", "See you tomorrow.", "Enjoy your holidays!", "Let's keep in touch."],
  ],
  'work.sales': [
    ["Hello, how can I help you?", "Are you looking for something in particular?", "Take your time.", "This one is very popular.", "What size do you need?", "We have it in blue and black.", "Would you like to try it?", "It's on sale today.", "Let me check if we have it.", "I'll be right back."],
    ["How would you like to pay?", "Do you have a loyalty card?", "Would you like a bag?", "That comes to twenty euros.", "You can pay by card or in cash.", "Here's your receipt.", "Can I have your name, please?", "Can I have your phone number?", "It will be ready on Monday.", "We can deliver it to your home."],
    ["I'm sorry for the inconvenience.", "What seems to be the problem?", "Do you have the receipt?", "We can exchange it.", "We can give you a refund.", "I'll call my manager.", "Could you wait a moment, please?", "I understand your frustration.", "Let me see what I can do.", "Unfortunately, it's out of stock."],
    ["Is there anything else I can do for you?", "Thank you for your patience.", "Have a nice day!", "Thanks for coming.", "See you next time!", "Enjoy it!", "Feel free to come back anytime.", "It was a pleasure.", "Do you need anything else?", "Good choice!"],
  ],
  'work.health': [
    ["Hello, I'm your nurse today.", "How are you feeling?", "Where does it hurt?", "Since when?", "Do you have a fever?", "Are you taking any medication?", "Do you have any allergies?", "Please sit down.", "Take a deep breath.", "Can you show me?"],
    ["I'm going to take your blood pressure.", "This won't hurt.", "Please lie down here.", "Roll up your sleeve, please.", "Take this twice a day.", "Take it after meals.", "Drink plenty of water.", "You need to rest.", "Come back in a week.", "Here is your prescription."],
    ["Is the pain getting worse?", "From one to ten, how bad is the pain?", "Did you hit your head?", "Do you feel dizzy?", "Call me if you need anything.", "Don't worry, it's normal.", "We need to do some tests.", "The doctor will see you soon.", "Is someone here with you?", "Do you have your health card?"],
    ["You're doing great.", "Get well soon!", "Try to sleep a bit.", "Do you need help getting up?", "Your family can visit at six.", "How did you sleep?", "Are you hungry?", "Tell me if it hurts.", "I'll be back in ten minutes.", "Take care!"],
  ],
  'work.hospitality': [
    ["Welcome! Do you have a reservation?", "Under what name?", "How many nights?", "Here is your room key.", "Breakfast is from seven to ten.", "Your room is on the third floor.", "The elevator is on the right.", "The Wi-Fi password is on the card.", "Can I see your passport, please?", "Enjoy your stay!"],
    ["A table for two?", "Here's the menu.", "Are you ready to order?", "What would you like to drink?", "I recommend the fish.", "Would you like a dessert?", "Is everything all right?", "Shall I bring the bill?", "Do you want to pay together or separately?", "The kitchen closes at eleven."],
    ["I'm sorry, we're fully booked.", "I'll fix it right away.", "Let me call housekeeping.", "Would you like another room?", "Checkout is at noon.", "You can leave your luggage here.", "Do you need a taxi?", "The museum is a ten-minute walk.", "I can recommend a good restaurant.", "It's just around the corner."],
    ["How was your day?", "Did you enjoy the meal?", "Where are you from?", "Is it your first time here?", "Have a great evening!", "Safe travels!", "We hope to see you again.", "Thank you for staying with us.", "Enjoy the city!", "Have fun!"],
  ],
  'work.tech': [
    ["I'm a developer.", "I work on the mobile app.", "What are you working on?", "Which tools do you use?", "I'm on the backend team.", "Our daily meeting is at ten.", "Can you give me access?", "Where's the documentation?", "I'll set it up today.", "I'm still new to the project."],
    ["I pushed the changes.", "Can you review my code?", "The tests are passing.", "It works on my machine.", "Let's deploy it tomorrow.", "I'll create a ticket.", "It's almost done.", "I need two more days.", "Let's work on it together.", "What's the priority?"],
    ["There's a bug in production.", "The server is down.", "I can't reproduce the problem.", "Did you check the logs?", "Let's go back to the previous version.", "I'll look into it.", "It's a quick fix.", "It's more complicated than I thought.", "Who can help me with this?", "I'm stuck."],
    ["Good idea!", "Nice work!", "That makes sense.", "Let's keep it simple.", "Any questions?", "I'll keep you posted.", "Let's talk tomorrow.", "Thanks for the help!", "Have a good weekend!", "See you at the meeting."],
  ],
  'work.education': [
    ["Good morning, everyone!", "Please sit down.", "Open your books to page ten.", "Today we're learning something new.", "Listen carefully.", "Can everyone see the board?", "Raise your hand, please.", "Who wants to start?", "Work in pairs.", "You have ten minutes."],
    ["Read the text out loud.", "Repeat after me.", "Who knows the answer?", "Very good!", "Almost, try again.", "Can you explain why?", "Write it in your notebook.", "Do you have any questions?", "Let's check the answers together.", "The homework is for Monday."],
    ["Please be quiet.", "Put your phone away, please.", "Why are you late?", "Don't worry, it's okay.", "Do you need help?", "Let's take a short break.", "Where's your homework?", "You can do it!", "Come and see me after class.", "We'll finish next time."],
    ["Good job today!", "I'm proud of you.", "See you tomorrow!", "Have a nice weekend!", "How was your holiday?", "Don't forget your books.", "Well done, everyone!", "Keep practicing.", "Any questions before we finish?", "Great effort!"],
  ],

  // --- Études ----------------------------------------------------------------
  'study.university': [
    ["I'm an exchange student.", "I'm studying engineering.", "What are you studying?", "Which year are you in?", "Where is the library?", "Is this seat free?", "Are you in this class too?", "When is the lecture?", "Where can I get my student card?", "Do you want to study together?"],
    ["Can I borrow your notes?", "When is the exam?", "What's on the exam?", "I have to hand in an essay.", "Can I ask the professor?", "Is attendance required?", "I didn't understand the lecture.", "Do we have homework?", "Let's meet at the library.", "I'm studying for the exam."],
    ["I missed the class.", "Can I have more time for the essay?", "Where is the office?", "I need to sign up for the course.", "I need a document for my visa.", "Is there a deadline?", "The room has changed.", "I'm a bit lost.", "Who should I ask?", "Can you show me how it works?"],
    ["Are you going to the party?", "Let's grab a drink after class.", "How did the exam go?", "I passed!", "Good luck tomorrow!", "Where do you live?", "Do you want to join us?", "It's been a long week.", "Let's celebrate!", "See you on campus!"],
  ],
  'study.exam': [
    ["Let me introduce myself.", "I live in a small town near the coast.", "I'm learning this language because I want to work abroad.", "In my free time, I like reading and cooking.", "I have one brother and one sister.", "I've been learning for two years.", "My goal is to pass this exam.", "I'd like to live abroad one day.", "I usually get up at seven.", "On weekends, I see my friends."],
    ["In my opinion, it's a good idea.", "I think that's true, but it depends.", "On the one hand, it's practical.", "On the other hand, it's expensive.", "I completely agree.", "I don't really agree.", "For example, in my country it's different.", "The main advantage is the price.", "The main problem is time.", "To sum up, I prefer the first option."],
    ["In this picture, I can see a family.", "They seem happy.", "It looks like a park.", "Last year, I traveled to Spain.", "It was an amazing experience.", "When I was a child, I used to play outside.", "If I had more time, I would travel more.", "I've never been there.", "It reminds me of my holidays.", "I'll never forget it."],
    ["Could you repeat the question, please?", "Let me think for a second.", "That's a good question.", "I'm not sure, but I think it's important.", "How can I put it?", "What I mean is that it's useful.", "Sorry, I meant something else.", "Could you explain that word?", "I'd like to add something.", "Thank you for listening."],
  ],
  'study.school': [
    ["Hi, I'm new here.", "What's your name?", "How old are you?", "Which class are you in?", "Where's the classroom?", "What's the next lesson?", "Can I sit here?", "Do you like this school?", "What's your favorite subject?", "I like sports."],
    ["Can I borrow a pen?", "What's the homework?", "I forgot my book.", "Can you help me with this exercise?", "When is the test?", "I don't get it.", "Can I go to the toilet?", "Can you repeat, please?", "How do you spell it?", "I'm finished."],
    ["Sorry, I'm late.", "I don't feel well.", "Can I call my parents?", "I lost my bag.", "Where's the cafeteria?", "What time do we finish?", "Is the teacher absent?", "Wait for me!", "Stop it, please.", "That's not fair."],
    ["Do you want to play?", "Let's go together.", "That's so funny!", "Cool!", "See you tomorrow!", "Text me later.", "What are you doing this weekend?", "Do you want to come over?", "I'm bored.", "Good luck on the test!"],
  ],
  'study.vocational': [
    ["I'm doing a professional training.", "It lasts six months.", "I want to change careers.", "What did you do before?", "Where is the workshop?", "What time does the training start?", "Who's the trainer?", "I have an internship next month.", "I'm looking for an internship.", "Nice to meet everyone."],
    ["Can you show me how to do it?", "Like this?", "Is this correct?", "Could you check my work?", "What tools do I need?", "Safety first.", "Put on your gloves.", "Let me try.", "I'll practice at home.", "What's the next step?"],
    ["I made a mistake.", "It's broken.", "I don't know how to use this machine.", "Can I ask a question?", "Where do I sign?", "I need a certificate.", "When is the exam?", "I can't come tomorrow.", "I'm a bit nervous.", "Can you help me fill in this form?"],
    ["That was useful.", "I'm learning a lot.", "Thanks for your patience.", "Good work today!", "See you on Monday.", "How's your internship going?", "I got the job!", "Congratulations!", "Let's stay in touch.", "Have a good evening!"],
  ],

  // --- Vie en général --------------------------------------------------------
  'general.travel': [
    ["Hello! Excuse me.", "Do you speak English?", "Where is the train station?", "How do I get to the city center?", "Is it far from here?", "Can I walk there?", "One ticket to the center, please.", "Which bus goes to the airport?", "Where can I buy a ticket?", "Is this the right platform?"],
    ["A table for two, please.", "Can I see the menu?", "I'd like this one, please.", "What do you recommend?", "Without meat, please.", "The bill, please.", "Can I pay by card?", "How much is this?", "That's too expensive.", "I'll take it."],
    ["I have a reservation.", "Is breakfast included?", "Can I leave my bag here?", "The Wi-Fi isn't working.", "I lost my phone.", "I need a pharmacy.", "Call the police, please!", "I'm lost.", "Can you show me on the map?", "Is there a toilet nearby?"],
    ["It's beautiful here!", "Where are you from?", "I'm on holiday.", "What should I visit?", "Can you take a photo of us?", "This is delicious!", "Thank you so much!", "Have a nice day!", "Cheers!", "I love this city!"],
  ],
  'general.daily': [
    ["I just moved here.", "I live in this neighborhood.", "I'm your new neighbor.", "Where's the nearest supermarket?", "What time does it open?", "Is there a bakery nearby?", "I'd like to open a bank account.", "I need a phone plan.", "How does the bus work here?", "Where can I recycle this?"],
    ["Half a kilo of tomatoes, please.", "Do you have bread?", "A coffee to go, please.", "Can I have a bag?", "Where's the milk?", "I'm just looking, thanks.", "I'd like to make an appointment.", "Is Tuesday possible?", "What documents do I need?", "Can I pay in cash?"],
    ["The heating isn't working.", "There's a leak in the kitchen.", "When can you come?", "I need a doctor.", "I have an appointment at ten.", "My package hasn't arrived.", "Can you sign for me?", "Sorry, I'm not from here.", "Could you write it down for me?", "How do you say that here?"],
    ["Good morning! How are you?", "Nice weather today!", "Have a good weekend!", "See you around!", "Thanks, you're very kind.", "Do you live here too?", "I'm getting used to it.", "I really like it here.", "Let's have a coffee sometime.", "Take care!"],
  ],
  'general.family': [
    ["Nice to meet you, I've heard so much about you.", "This is my partner.", "I'm so happy to be here.", "Your home is beautiful.", "Thank you for inviting me.", "How are you all?", "This is for you.", "Can I help with anything?", "How was your day?", "I missed you."],
    ["It's delicious!", "Can I have a little more?", "I'm full, thank you.", "Who cooked this?", "Can you teach me the recipe?", "Let's eat together.", "Shall we go for a walk?", "What do you want to do tonight?", "Let's watch a movie.", "Let's stay home."],
    ["I don't understand everything yet.", "Can you explain it to me?", "I'm learning this language for you.", "Sorry, I'm still learning.", "What did she say?", "How do you say this word?", "Correct me if I'm wrong.", "I'm doing my best.", "Speak slowly with me, please.", "I'll get better."],
    ["I love you.", "You make me happy.", "I'm proud of you.", "I feel good with you.", "Sleep well.", "Good night!", "Give my love to your parents.", "Happy birthday!", "We're family now.", "See you soon!"],
  ],
  'general.fun': [
    ["Hi! How's it going?", "Surprise! I'm learning your language.", "I wanted to surprise you.", "Did you understand me?", "I've been practicing every day.", "I love the sound of this language.", "Teach me a new word.", "How do I sound?", "Is my accent okay?", "Don't laugh at me!"],
    ["What are you up to?", "Do you want to grab a drink?", "Let's go out tonight.", "What kind of music do you like?", "Have you seen this movie?", "Me too!", "Not really.", "That sounds fun!", "Why not?", "I'm in!"],
    ["Say it again, slower.", "What does that word mean?", "Is that slang?", "How do young people say it?", "Is that rude?", "Write it down for me.", "I get it now!", "Wait, what?", "You're kidding!", "No way!"],
    ["That's hilarious!", "You're the best!", "I had so much fun.", "Let's do it again.", "Thanks for everything.", "Cheers to that!", "Text me!", "I miss you already!", "See you soon!", "Good vibes!"],
  ],
};

// Phrases d'une semaine (0 à 3) pour une situation : noyau d'autonomie puis bloc de la situation.
export function weekPhrases(situation, week) {
  return [...CORE[week], ...SITUATIONS[situation][week]];
}
