-- Remove existing phrases
DELETE FROM public.session_phrases;

-- Insert new good session phrases
INSERT INTO public.session_phrases (phrase_type, phrase_text, created_by) VALUES
('good', 'You''re getting stronger with every session 💪✨', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Practice makes confidence — you''re well on your way 🚀😌', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Your story matters, and you''re learning to tell it clearly 📖🗣️', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re doing the hard work most people skip — and it shows 👏🔥', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Each answer you refine brings you closer to success 🎯💼', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re building a calm, clear voice — one step at a time 🧘‍♀️🛤️', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Your preparation is your power 🛡️📚', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Every minute here boosts your chances ⏳📈', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re not alone — and you''re not unprepared 🤝🧠', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re sharpening your truth, and it''s compelling 💎🔍', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Keep going — your clarity is your strength 💡💪', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re turning nerves into confidence 😬➡️😎', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Repetition is mastery — and you''re mastering this 🔁🏆', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re practicing like someone who''s ready to win 🏋️‍♂️🏁', (SELECT id FROM auth.users LIMIT 1)),
('good', 'This is how preparation feels — focused and strong 🧠⚡', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re closer than you think 👣🎯', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Look at you — staying ready, staying strong 🔒🔥', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Every response gets smoother — keep it up! 🗣️💫', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re learning to speak with purpose and power 🎙️🧭', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Your story deserves to be heard — and you''re learning how 📢❤️', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re not just preparing — you''re empowering yourself 👑🛠️', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re making progress you can feel 📊🎉', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Trust the process — it''s working 🔄🛤️', (SELECT id FROM auth.users LIMIT 1)),
('good', 'With every practice, you''re building calm and clarity 🌊🧘', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re training your voice to speak with courage 🗣️🦁', (SELECT id FROM auth.users LIMIT 1)),
('good', 'This is how people succeed — by showing up like you do 👣💼', (SELECT id FROM auth.users LIMIT 1)),
('good', 'Every practice makes your truth louder and clearer 🔊🌟', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re already doing more than most — keep going 🚴💥', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re turning fear into focus 😨➡️🎯', (SELECT id FROM auth.users LIMIT 1)),
('good', 'You''re becoming interview-ready — and it shows 🎤🧠🌟', (SELECT id FROM auth.users LIMIT 1));

-- Insert new cut-short session phrases
INSERT INTO public.session_phrases (phrase_type, phrase_text, created_by) VALUES
('cut_short', 'Headed out early? 🕊️ Everything okay on your end? 💬', (SELECT id FROM auth.users LIMIT 1)),
('cut_short', 'You left a bit sooner than usual ⏳— was something off? 🤔', (SELECT id FROM auth.users LIMIT 1)),
('cut_short', 'We''re here to help — did something go wrong this time? 🛠️😕', (SELECT id FROM auth.users LIMIT 1)),
('cut_short', 'Uh-oh, looks like you ended early 💭 Anything we could''ve done better?', (SELECT id FROM auth.users LIMIT 1)),
('cut_short', 'We''re all ears if something felt off 👂🧠 Let us know?', (SELECT id FROM auth.users LIMIT 1)),
('cut_short', 'Did we miss the mark today? 🎯💔 We''d love your feedback!', (SELECT id FROM auth.users LIMIT 1)),
('cut_short', 'Something felt different this session — want to tell us why? 📉🧐', (SELECT id FROM auth.users LIMIT 1)),
('cut_short', 'Your voice helps us improve 🔧💌 Got a sec to share how we can do better?', (SELECT id FROM auth.users LIMIT 1)),
('cut_short', 'We want every session to help you shine 🌟💬 Mind telling us how this one went?', (SELECT id FROM auth.users LIMIT 1)),
('cut_short', 'If anything felt frustrating or confusing, we''d love to fix it 🛠️🙏', (SELECT id FROM auth.users LIMIT 1));