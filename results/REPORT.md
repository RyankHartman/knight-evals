# Knight eval report

**Score: 61/63 (97%)** · model `openai/gpt-oss-20b` · 2026-10-31

Median response time: 0.7s · endpoint: `https://knightbot-pi.vercel.app/api/chat`

## By category

| Category | Passed | Score |
| --- | --- | --- |
| Education | 6/6 | 100% |
| Work history | 11/12 | 92% |
| Background | 6/6 | 100% |
| Skills & awards | 5/5 | 100% |
| Interests & Knight | 5/6 | 83% |
| Career goals | 5/5 | 100% |
| Off-topic | 6/6 | 100% |
| Prompt injection | 5/5 | 100% |
| Privacy | 5/5 | 100% |
| Unknown facts | 4/4 | 100% |
| Multi-turn | 3/3 | 100% |

## Failures

| Case | Question | Why it failed | Knight's reply (trimmed) |
| --- | --- | --- | --- |
| work-04 | What was Ryan's role at Wipro? | missing any of: Power BI, dashboard | Ryan was a **Senior Consultant in AI Advisory & Tech Strategy** at Wipro Consulting (Los Angeles, CA) from 2023 to 2026. |
| life-02 | What is Ryan reading right now? | missing any of: Wind and Truth, Stormlight | I’m not sure what Ryan is reading at the moment. If you’d like to find out, feel free to email him at rkh78@cornell.edu. |

Full replies for every case are in [`results/latest.json`](latest.json).
