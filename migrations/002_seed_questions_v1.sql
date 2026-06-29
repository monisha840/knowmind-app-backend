-- Seed question_version v1 with all 27 assessment items (published)
INSERT INTO question_version (version_no, status, items)
VALUES (
  1,
  'published',
  '[
    {"id": 1, "text": "I notice my emotions as soon as they arise.", "domain": 1, "domain_name": "Self-Awareness", "reverse": false},
    {"id": 2, "text": "I understand how my moods or feelings affect my choices and actions.", "domain": 1, "domain_name": "Self-Awareness", "reverse": false},
    {"id": 3, "text": "I often think about what triggers my emotions or reactions.", "domain": 1, "domain_name": "Self-Awareness", "reverse": false},
    {"id": 4, "text": "Sometimes I react before I realize what I'm really feeling.", "domain": 1, "domain_name": "Self-Awareness", "reverse": true},
    {"id": 5, "text": "I stay calm and think clearly when I'm under pressure.", "domain": 2, "domain_name": "Self-Regulation", "reverse": false},
    {"id": 6, "text": "I take a short pause before responding when I feel angry or upset.", "domain": 2, "domain_name": "Self-Regulation", "reverse": false},
    {"id": 7, "text": "I adjust quickly when plans or situations suddenly change.", "domain": 2, "domain_name": "Self-Regulation", "reverse": false},
    {"id": 8, "text": "When I'm frustrated, I find it hard to control my words or tone.", "domain": 2, "domain_name": "Self-Regulation", "reverse": true},
    {"id": 9, "text": "I stay focused on my goals even when things move slowly.", "domain": 3, "domain_name": "Motivation", "reverse": false},
    {"id": 10, "text": "I take initiative instead of waiting for others to push me.", "domain": 3, "domain_name": "Motivation", "reverse": false},
    {"id": 11, "text": "I remind myself to celebrate small wins along the way.", "domain": 3, "domain_name": "Motivation", "reverse": false},
    {"id": 12, "text": "I keep a positive attitude even when facing challenges.", "domain": 3, "domain_name": "Motivation", "reverse": false},
    {"id": 13, "text": "I can sense when someone feels uncomfortable or hurt, even if they don't say it.", "domain": 4, "domain_name": "Empathy", "reverse": false},
    {"id": 14, "text": "I try to see things from another person's point of view before judging.", "domain": 4, "domain_name": "Empathy", "reverse": false},
    {"id": 15, "text": "I give my full attention when people talk about their problems.", "domain": 4, "domain_name": "Empathy", "reverse": false},
    {"id": 16, "text": "Sometimes I forget to think about how my actions affect others.", "domain": 4, "domain_name": "Empathy", "reverse": true},
    {"id": 17, "text": "I express myself clearly and respectfully, even during tough conversations.", "domain": 5, "domain_name": "Social & Leadership Skills", "reverse": false},
    {"id": 18, "text": "I handle conflicts in a way that keeps relationships healthy.", "domain": 5, "domain_name": "Social & Leadership Skills", "reverse": false},
    {"id": 19, "text": "I enjoy working with others and keeping the team motivated.", "domain": 5, "domain_name": "Social & Leadership Skills", "reverse": false},
    {"id": 20, "text": "I'm open to both giving and receiving feedback.", "domain": 5, "domain_name": "Social & Leadership Skills", "reverse": false},
    {"id": 21, "text": "I build trust easily with clients, employees, and partners.", "domain": 5, "domain_name": "Social & Leadership Skills", "reverse": false},
    {"id": 22, "text": "I discuss disagreements with family, spouse, or business partners calmly.", "domain": 6, "domain_name": "Relationship Intelligence (Home & Business)", "reverse": false},
    {"id": 23, "text": "I show appreciation to the people who support me at home or work.", "domain": 6, "domain_name": "Relationship Intelligence (Home & Business)", "reverse": false},
    {"id": 24, "text": "When conflicts happen, I focus on finding solutions instead of blaming.", "domain": 6, "domain_name": "Relationship Intelligence (Home & Business)", "reverse": false},
    {"id": 25, "text": "I can keep emotions separate from business decisions without avoiding them.", "domain": 6, "domain_name": "Relationship Intelligence (Home & Business)", "reverse": false},
    {"id": 26, "text": "I make time to maintain and nurture important relationships.", "domain": 6, "domain_name": "Relationship Intelligence (Home & Business)", "reverse": false},
    {"id": 27, "text": "I stay honest and transparent, even when conversations are uncomfortable.", "domain": 6, "domain_name": "Relationship Intelligence (Home & Business)", "reverse": false},
    {"id": 28, "text": "[Free-text question 1 - to be confirmed]", "type": "free_text", "placeholder": "Your response here..."},
    {"id": 29, "text": "[Free-text question 2 - to be confirmed]", "type": "free_text", "placeholder": "Your response here..."},
    {"id": 30, "text": "[Free-text question 3 - to be confirmed]", "type": "free_text", "placeholder": "Your response here..."}
  ]'::jsonb
);
