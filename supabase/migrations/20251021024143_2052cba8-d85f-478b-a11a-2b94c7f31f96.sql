-- Create test_stories table for guest practice stories
CREATE TABLE public.test_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('political', 'race', 'religion', 'gender', 'nationality', 'social_group')),
  country_origin TEXT NOT NULL,
  summary TEXT NOT NULL,
  full_story_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active test stories"
  ON public.test_stories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage test stories"
  ON public.test_stories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_test_stories_active_order ON public.test_stories(is_active, display_order);

-- Trigger for updated_at
CREATE TRIGGER update_test_stories_updated_at
  BEFORE UPDATE ON public.test_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default test stories
INSERT INTO public.test_stories (title, category, country_origin, summary, full_story_text, display_order) VALUES
(
  'Venezuelan Political Activist',
  'political',
  'Venezuela',
  'A political activist who faced persecution for opposing the government and participating in peaceful protests against the Maduro regime.',
  'I am a Venezuelan citizen who fled my country due to persecution for my political opinions. I actively participated in peaceful protests against the Maduro regime and worked with opposition groups to advocate for democratic reforms and human rights. As a result of my activism, I received multiple threats from government-affiliated groups. My home was vandalized with threatening messages, and I was followed by unknown individuals on several occasions. In 2022, I was detained by security forces during a protest and held for 48 hours without charges. During my detention, I was interrogated about my political activities and threatened with imprisonment if I continued my activism. After my release, the threats intensified. Pro-government militias known as "colectivos" came to my neighborhood looking for me. Fearing for my life and safety, I made the difficult decision to flee Venezuela and seek asylum in the United States. I fear returning to Venezuela because the government continues to target political dissidents, and there is no protection available from the authorities.',
  1
),
(
  'Haitian Targeted for Race',
  'race',
  'Haiti',
  'An individual who experienced severe discrimination, violence, and threats based on their Afro-Caribbean heritage and appearance.',
  'I am from Haiti, where I faced persistent persecution due to my race and ethnic background. In Haiti, there is a deeply rooted colorism problem, where lighter-skinned individuals hold more power and privilege, while darker-skinned people like myself face systemic discrimination. I come from a predominantly dark-skinned family, and throughout my life, I experienced discrimination in education, employment, and daily interactions. I was denied job opportunities despite being qualified, solely because of my skin color. I was subjected to derogatory comments and slurs regularly. The situation escalated when I became involved in a community organization advocating for equal rights for darker-skinned Haitians. Our group faced violent opposition from powerful families and political figures who wanted to maintain the status quo. Our meetings were disrupted, and members received death threats. In early 2023, my home was attacked by a group of men who warned me to stop my activism or face serious consequences. Shortly after, one of my fellow activists was killed in what police claimed was a robbery, but we believe it was targeted violence. I realized that staying in Haiti meant risking my life. The government offers no protection, and the police are often complicit in the discrimination. I fled to the United States seeking asylum because I cannot safely return to Haiti.',
  2
),
(
  'Afghan Religious Minority',
  'religion',
  'Afghanistan',
  'A member of the Hazara Shia Muslim minority group facing persecution under Taliban rule and from extremist groups.',
  'I am a member of the Hazara ethnic and religious minority in Afghanistan. The Hazara people are predominantly Shia Muslims in a country where the majority is Sunni, and we have faced centuries of persecution. Under Taliban rule, which returned to power in August 2021, the persecution of Hazaras has intensified dramatically. I lived in the Hazara-majority region of Bamiyan, where I worked as a teacher at a local school. After the Taliban takeover, they began implementing strict regulations and targeted Hazara communities specifically. Schools were shut down, especially those serving girls, and teachers like myself were seen as threats to their ideology. In October 2022, the Taliban raided our school. They accused us of teaching "un-Islamic" subjects and spreading Shia beliefs. Several of my colleagues were detained, and I narrowly escaped. The Taliban has also carried out targeted attacks on Hazara gatherings and mosques. In September 2022, a suicide bombing at a Hazara mosque in Kabul killed over 50 people during Friday prayers. Similar attacks have occurred throughout Afghanistan, creating an atmosphere of constant fear. I received direct threats from local Taliban commanders warning me to stop teaching and to conform to their interpretation of Islam. When I refused, my family and I were targeted. My younger brother was beaten by Taliban fighters as a warning. Fearing for our lives and unable to practice our religion freely, I fled Afghanistan. I cannot return because the Taliban controls the government, and there is no one to protect religious minorities like the Hazara people.',
  3
);