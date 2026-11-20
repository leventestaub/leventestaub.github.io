// All copy is placeholder: the user writes the final wording.
// Facts come only from the fact-checked write-ups in project-grad/portfolio/case-studies/ (which trace to profile/master-profile.md).
// Open publishing questions stay neutral here: no client names (Sentify client, NPEC), NPEC plates cleared for public use (2026-11-19).

export type Ratio = '16:9' | '16:10' | '4:3' | '1:1' | '9:16';
export type Figure =
  | { kind: 'chart'; src: string; alt: string; wide?: boolean }                       // inlined SVG
  | { kind: 'image'; src: string; alt: string; ratio?: Ratio; wide?: boolean }         // WebP 2400 + -1200
  | { kind: 'compare'; before: string; after: string; labels: [string, string]; alt: string; ratio?: Ratio; wide?: boolean }
  | { kind: 'video'; src: string; poster: string; alt: string; ratio?: Ratio; wide?: boolean; phone?: string }   // phone = portrait screen recording, shown whole on this ground colour
  | { kind: 'table'; head: string[]; rows: string[][]; wide?: boolean };
export interface Chapter { id: string; title: string; body: string[]; figures?: Figure[] }
export interface Metric { value: number; decimals: number; prefix?: string; suffix?: string; label: string }
export type Focus = 'Computer vision' | 'ML engineering' | 'MLOps' | 'LLM';
export const focusAreas: Focus[] = ['Computer vision', 'ML engineering', 'MLOps', 'LLM'];
// srcset for a cover: the sized copies from tools/cover_sizes.mjs plus the 2560 original
export const coverSet = (src: string) => [640, 1280, 1920].map((w) => src.replace(/\.webp$/, '-' + w + '.webp') + ' ' + w + 'w').concat(src + ' 2560w').join(', ');
export interface Project {
  slug: string; title: string; line: string; year: string;
  rows: [string, string][];          // model-card spec (home cards)
  meta: [string, string][];          // case hero metadata row
  result: string;                    // one result chip
  cover: string;                     // 16:10 (cards, work index, next project); final picks from project-grad/portfolio/covers
  coverWide: string;                 // 16:9 case cover
  coverPos?: string;                 // object-position for cropped previews (e.g. keep a label column)
  focus: Focus[];                    // Work index filter chips (same words as the About focus columns)
  featured?: boolean;                // shown in the Work strip (3-4 max)
  pipeline: string[];                // drawn SVG steps
  metrics: Metric[];
  chapters: Chapter[];
  repo?: string;
  writeup?: string;                  // full GitHub write-up (falls back to repo)
}

export const work: Project[] = [
  {
    slug: 'sentify', title: 'Sentify', year: '2026', focus: ['MLOps', 'ML engineering'], featured: true,
    line: 'An emotion-classification model with the pipeline that retrains, gates and rolls it out.',
    rows: [['Task', 'Emotion classification'], ['My part', 'Retraining, registration gate, canary and blue-green rollout'], ['Stack', 'Azure ML, MLflow, Docker'], ['Team', 'Group project']],
    meta: [['Role', 'Model lifecycle'], ['Team', 'Group project'], ['Period', 'Apr–Jun 2026'], ['Stack', 'Azure ML, MLflow, Airflow, FastAPI']],
    result: 'Macro F1 0.84 (validation)',
    cover: '/covers/sentify-hook-16x10.webp', coverPos: '0% 50%', coverWide: '/covers/sentify-hook-16x9.webp',
    pipeline: ['Transcribe', 'Classify', 'Collect corrections', 'Retrain', 'Gate', 'Roll out'],
    metrics: [
      { value: 0.84, decimals: 2, label: 'Macro F1 on validation' },
      { value: 560, decimals: 0, label: 'Tests in CI' },
      { value: 20, decimals: 0, suffix: '%', label: 'Canary traffic share' },
    ],
    chapters: [
      {"id":"problem","title":"Problem","body":["A media-production client wanted to paste in a video or audio clip and get back a transcript, with an emotion label and a confidence score for every sentence. It was a team project from April to June 2026.","The model was one part of the job. The harder questions came after the first release: how user corrections get back into training, how a new model is checked before it replaces the old one, and how the same package runs in the cloud and on a company server."],"figures":[{"kind":"video","src":"/work/sentify/advert.mp4","poster":"/work/sentify/advert-poster.webp","alt":"Screen recording of the Sentify advert: a video link is pasted and per-sentence emotions, word-level explanations and the audience reaction appear."}]},
      {"id":"approach","title":"Approach","body":["The classifier is a fine-tuned BERT over seven classes: Ekman's six emotions plus neutral. Integrated Gradients show which words drove each prediction. A FastAPI service serves it to a React frontend.","Corrections made in the frontend become versioned training data. Retraining runs as an Azure ML pipeline in the cloud and as an Airflow job on the on-premise server. It starts from the current model, for 2 epochs at a capped learning rate, so a small batch of feedback does not pull the model far from what already works.","A registration gate lets a candidate into the registry only if it beats the current model on macro F1, which weighs every emotion equally. Azure ML and MLflow sit behind one interface, so the same gate runs in both places. Promotion stays a manual approval, and in Azure a new version first takes 20% of the traffic as a canary."]},
      {"id":"part","title":"My part","body":["I worked on the model lifecycle: the Azure ML retraining pipeline and its fine-tune mode, the registration gate and the shared registry interface, and the endpoint that connects the on-premise Airflow run to the gate.","I also built the canary and blue/green deployment with a comparison of the two, the self-hosted MLflow stack, most of the unit tests, and the cost estimate."]},
      {"id":"results","title":"Results","body":["The first training setup collapsed to low-confidence predictions at a macro F1 of 0.41. Focal loss with AdamW at a lower learning rate brought it to 0.84.","The package has 560 tests at 83% coverage, run in CI on every pull request. Running the cloud endpoint during weekday working hours instead of around the clock lowers its cost from about 152 to 55 EUR a month. That figure is an estimate from public prices."],"figures":[{"kind":"chart","src":"/work/sentify/f1.svg","alt":"Bar chart of macro F1: 0.41 for the first setup and 0.84 after focal loss and a lower learning rate.","wide":false},{"kind":"chart","src":"/work/sentify/cost.svg","alt":"Bar chart of estimated cloud endpoint cost per month: about 152 EUR always on, about 55 EUR on working hours only.","wide":false}]},
      {"id":"next","title":"Limits and next","body":["Monitoring is a dashboard without alerting or drift detection, and canary promotion is started by hand. There is one model architecture and a small dataset.","The natural next step is to connect drift detection to the retraining loop."]},
    ],
    writeup: 'https://github.com/leventestaub/portfolio/blob/main/sentify-emotion-mlops.md',
  },
  {
    slug: 'root-phenotyping', title: 'Root phenotyping', year: '2025–26', focus: ['Computer vision'], featured: true,
    line: 'Segmenting plant roots, finding their tips and guiding a simulated pipetting robot to them.',
    rows: [['Task', 'Segmentation, tip detection'], ['Method', 'U-Net, architecture study with statistical tests'], ['Output', 'Simulated pipetting robot'], ['Stack', 'TensorFlow, OpenCV']],
    meta: [['Role', 'Solo pipeline, then architecture study'], ['Team', 'Solo + group'], ['Period', 'Nov 2025–Apr 2026'], ['Stack', 'Keras, OpenCV, PyBullet']],
    result: '5 of 5 tips reached (simulation)',
    cover: '/covers/root-phenotyping-16x10.webp', coverWide: '/covers/root-phenotyping-16x9.webp',
    pipeline: ['Patch', 'Segment', 'Skeletonise', 'Find tip', 'Calibrate', 'Drive pipette'],
    metrics: [
      { value: 0.863, decimals: 3, label: 'Validation F1, root class' },
      { value: 7.18, decimals: 2, suffix: '%', label: 'sMAPE on root length' },
      { value: 5, decimals: 0, suffix: '/5', label: 'Tips within 1 mm tolerance' },
    ],
    chapters: [
      {"id":"problem","title":"Problem","body":["Seedlings grow on petri dishes, and someone has to find each root, measure it and mark the tip. The goal here was to automate that: segment the roots in a plate image, measure them, locate every root tip, and send a simulated pipetting robot to each tip.","Roots are thin, faint and rare. In the training data, 83.6% of image patches contain no root and 99.6% of pixels are background."]},
      {"id":"approach","title":"Approach","body":["Each plate is cut into 256 px patches and a U-Net predicts a root mask. The mask is skeletonised and small gaps are bridged. For every plant a shortest-path search from its start point to the best end point gives the main root, and its end is the tip.","Pixel positions are converted to robot coordinates with a scale taken from the detected plate size, and a PID controller moves the simulated pipette to each tip."],"figures":[{"kind":"compare","before":"/work/root-phenotyping/compare-input.webp","after":"/work/root-phenotyping/compare-prediction.webp","labels":["Input","Prediction"],"alt":"A plate with five seedlings. The slider shows the raw image and the same image with each main root in green and its detected tip marked with an orange cross."}]},
      {"id":"part","title":"My part","body":["The pipeline from segmentation to integration is my own work: patching and training the U-Net, the skeleton and tip search, the coordinate conversion and the hand-over to the robot controller.","The architecture study was a team project. In it I owned the architecture comparison and its statistical analysis, including the check of whether the differences between models were larger than the noise between patches."]},
      {"id":"results","title":"Results","body":["The U-Net reaches a validation F1 of 0.863 for the root class. On the course Kaggle competition for root length it scored a sMAPE of 7.18%, rank 14. End to end on one plate with five plants, the pipeline found all five tips and the controller brought the pipette within the 1 mm tolerance of each.","The architecture study asked whether U-Net++, Attention U-Net or DeepLabV3+ beat a plain U-Net with everything else held equal. Attention U-Net came out first, by 0.012 IoU. The spread between the four models is 0.029, while a single model varies by about 0.20 from patch to patch. On this data, a more complex architecture buys little.","Attention U-Net did improve results on sparse patches, the ones with under 1% root, and that is the case that matters for thin roots. The table lists the four models with the same training setup."],"figures":[{"kind":"chart","src":"/work/root-phenotyping/architectures.svg","alt":"Dot plot of per-patch IoU for four architectures on 157 test patches with roots. The mean bars are close together, from 0.629 to 0.658, and the dots spread widely.","wide":false},{"kind":"table","head":["Model","IoU","IoU, sparse","Recall"],"rows":[["Attention U-Net","0.658","0.592","0.828"],["U-Net (baseline)","0.646","0.558","0.813"],["DeepLabV3+","0.640","0.567","0.836"],["U-Net++","0.629","0.525","0.791"]]}]},
      {"id":"next","title":"Limits and next","body":["Everything runs in simulation, and the 1 mm figure is the controller's stopping tolerance, not tip accuracy against ground truth. The calibration assumes a fixed plate position, and the integration test covers one plate.","The segmentation F1 is a validation score. The model in the pipeline had no separate test set."]},
    ],
    writeup: 'https://github.com/leventestaub/portfolio/blob/main/plant-root-phenotyping.md',
  },
  {
    slug: 'pastaio', title: 'Pastaio', year: '2026', focus: ['LLM', 'ML engineering'], featured: true,
    line: 'A mobile cooking assistant whose LLM agent answers from a recipe database.',
    rows: [['Task', 'Cooking assistant'], ['Method', 'LLM agent grounded in a recipe database'], ['Platform', 'Mobile']],
    meta: [['Role', 'Everything'], ['Team', 'Solo'], ['Period', '2026'], ['Stack', 'FastAPI, Pydantic, Expo']],
    result: '35 scripted conversations in eval',
    cover: '/covers/pastaio-16x10.webp', coverWide: '/covers/pastaio-16x9.webp',
    pipeline: ['Message + context', 'Agent loop', 'Validate call', 'Look up', 'Act in app'],
    metrics: [
      { value: 35, decimals: 0, label: 'Multi-turn eval conversations' },
      { value: 31, decimals: 0, label: 'Single-turn checks' },
      { value: 4, decimals: 0, label: 'Model calls per turn, at most' },
    ],
    chapters: [
      {"id":"problem","title":"Problem","body":["Pastaio is an Italian pasta-cooking app. You photograph a pasta shape, pick a dish and cook it step by step, and on any screen you can ask it something: \"scale this for two\", \"I'm vegetarian\", \"set a timer for that\".","A language model can answer all of that, but it can also invent a regulation or ignore a dietary restriction. I wanted an assistant where the rules that must not break are enforced by code, and the model cannot override them."],"figures":[{"kind":"image","src":"/work/pastaio/diet.webp","ratio":"16:10","wide":true,"alt":"Two app screens with a vegetarian restriction stored. Left: the Bucatini all'Amatriciana recipe flags guanciale as conflicting with the vegetarian preference. Right: asked what to cook tonight, Pastaio suggests Spaghetti aglio, olio e peperoncino, and the trace shows 3 recipes found and 7 excluded by the diet."}]},
      {"id":"approach","title":"Approach","body":["The agent can only reach structured tools. Data tools run on the server against a knowledge base of 18 recipes, each fact tied to an institutional Italian source. Action tools, such as opening a recipe or setting a timer, are validated and run on the phone through the same code as the buttons.","Each turn the app sends its context: the screen, the recipe and step, running timers and dietary restrictions. The model only sees the tools that make sense on that screen. The loop is capped at 4 model calls, and the last call has no tools, so it must answer in text.","Every answer shows what the backend did in that turn, under \"How Pastaio answered\"."],"figures":[{"kind":"image","src":"/work/pastaio/answers.webp","alt":"Three app screens. Left: a recipe scaled for two people, 200 g rigatoni and 75 g guanciale, with the trace showing the amounts were scaled in code. Middle: a sourced answer about where amatriciana comes from. Right: a 10-minute timer started from the recipe step.","ratio":"16:10","wide":true}]},
      {"id":"part","title":"My part","body":["Pastaio is a solo project and my own idea, not a course assignment. I built the app, the backend, the knowledge base and the evaluation harness."]},
      {"id":"results","title":"Results","body":["The guarantees are enforced in the backend and tested in CI without any model. Dietary restrictions fail closed: an ingredient counts as safe only if its class is known to be compatible. Scaling is computed in code, and the model only reports the numbers. Invalid tool calls get one repair attempt and are never passed on to the app.","An evaluation harness runs 35 multi-turn conversations against the backend, and 31 single-turn checks compare the grounded agent with the same model without the knowledge base. They are regression tests for these rules, not a leaderboard. One finding changed the design: without a required lookup, the model cited an EU regulation from memory, and the citation was wrong."],"figures":[{"kind":"table","head":["Rule","How it is enforced"],"rows":[["Dietary restrictions","Searches drop conflicting recipes in code"],["Facts and sources","A lookup is required before a factual answer"],["Tool calls","Schema check, one repair attempt"],["Recipe IDs","Resolved to a real ID or rejected"],["Loop length","At most 4 model calls per turn"]]}]},
      {"id":"next","title":"Limits and next","body":["The knowledge base is small: 18 recipes from five regions, and no sourced substitution rules yet. The backend runs on a free model tier, so replies slow down when the quota runs low, and photo identification depends on one model.","Next on the list is an evaluation of the photo step, sourced substitution rules, and a small model that runs on the phone."]},
    ],
    writeup: 'https://github.com/leventestaub/pastaio',
    repo: 'https://github.com/leventestaub/pastaio',
  },
  {
    slug: 'fraud-drift', title: 'Fraud drift monitoring', year: '2026', focus: ['MLOps'],
    line: 'A drift monitor and retraining trigger that tell when a fraud model stops being trustworthy.',
    rows: [['Task', 'Drift detection, retraining decisions'], ['Approach', 'KS + PSI per feature, labelled AUC check, tiered trigger'], ['Stack', 'XGBoost, Evidently, Streamlit'], ['Team', 'Team of three']],
    meta: [['Team', 'Team of three'], ['Period', 'Apr 2026'], ['Data', 'Public credit-card fraud set'], ['Stack', 'XGBoost, SciPy, Evidently, Streamlit']],
    result: 'Caught the silent drift (AUC 0.45)',
    cover: '/covers/fraud-drift-16x10.webp', coverWide: '/covers/fraud-drift-16x9.webp',
    pipeline: ['New batch', 'Drift monitor', 'Performance check', 'Trigger', 'Verdict'],
    metrics: [
      { value: 0.989, decimals: 3, label: 'Baseline ROC-AUC' },
      { value: 0.448, decimals: 3, label: 'ROC-AUC on the silent batch' },
      { value: 29, decimals: 0, label: 'Features monitored' },
    ],
    chapters: [
      {"id":"problem","title":"Problem","body":["A fraud model can stop working without any error message. The data it sees changes, and its scores slowly lose meaning. We wanted a monitor that tells a team whether to retrain, watch or leave the model alone.","As a test bed we trained an XGBoost classifier on the public credit-card fraud dataset (284,807 transactions, 0.173% fraud). It reaches a ROC-AUC of 0.989 on its test set. We then ran it on five simulated production batches, each with a different kind of drift."]},
      {"id":"approach","title":"Approach","body":["The monitor has two layers. The first compares every one of the 29 features with the training data using a Kolmogorov-Smirnov test and the Population Stability Index, with a warning at 0.10 and a critical level at 0.20. A feature only counts as actionable if it fails both tests, which filters out the tiny shifts KS flags on large batches. The second layer checks the ROC-AUC once the labels for a batch arrive.","A five-tier trigger turns both into a verdict. The tiers are checked in order and the first match wins. A Streamlit dashboard shows the evidence for each batch."],"figures":[{"kind":"table","head":["Tier","Condition","Verdict"],"rows":[["1","ROC-AUC below 0.50","Retrain now"],["2","A feature fails KS and PSI","Retrain"],["3","AUC drop over 0.10","Monitor, recalibrate"],["4","3+ PSI warnings or 20+ KS flags","Monitor, review"],["5","None of the above","Stable"]]}]},
      {"id":"part","title":"Team","body":["This was a three-person project in April 2026, and we worked on it together. We built the classifier, simulated the five batches, wrote the monitor and the trigger, and made the dashboard."]},
      {"id":"results","title":"Results","body":["Batches 1 and 2, a localised spike and a collapsed feature, were caught by both layers. Batch 3 had three times the fraud rate with the same patterns, and the trigger correctly did not ask for a retrain.","Batch 4 is the important one. Many features shifted a little at once, and none crossed the PSI threshold, so the drift layer stayed silent. Yet the AUC fell to 0.448, below random, and the model caught none of the 25 frauds in the batch. Only the performance layer caught it. All 29 features were KS-flagged, which is a cheap early hint.","Batch 5 is the opposite case: an 11.5 times higher fraud rate shifted 28 of 29 features and raised a warning while the model was fine."],"figures":[{"kind":"chart","src":"/work/fraud-drift/auc-by-batch.svg","alt":"Bar chart of ROC-AUC for five simulated production batches against a baseline of 0.989. Batch 4 is highlighted at 0.448, below the random level of 0.5.","wide":false},{"kind":"chart","src":"/work/fraud-drift/psi-batch4.svg","alt":"Horizontal bars of the twelve highest PSI values in batch 4. The top feature, V8, reaches 0.183 and no feature crosses the 0.20 line.","wide":false}]},
      {"id":"next","title":"Limits and next","body":["The drift batches are simulated, not real production data. We assumed labels are available for every batch, while in practice they arrive late, which is when a batch-4 failure hurts most. The thresholds were set by reasoning and not tuned on past incidents.","A fix for batch 5 would be to suppress tier 4 when the AUC stays above about 0.85."]},
    ],
    writeup: 'https://github.com/leventestaub/portfolio/blob/main/fraud-drift-monitoring.md',
  },
  {
    slug: 'robotics', title: 'Robotics', year: '2025–26', focus: ['ML engineering'],
    line: 'A reinforcement-learning controller for a pipetting robot, a tic-tac-toe arm and humanoid experiments.',
    rows: [['Task', 'Robot control'], ['My part', 'SAC controller (own); arm move execution (team)'], ['Stack', 'Stable-Baselines3, PyBullet, ClearML'], ['Team', 'Own work and team projects']],
    meta: [['Period', 'Nov 2025 – Jan 2026'], ['Robots', 'OT-2 (sim), Niryo arm, Unitree G1'], ['Stack', 'SB3, PyBullet, ClearML, W&B, ROS 2']],
    result: 'All targets under 1 mm',
    cover: '/covers/robotics-16x10.webp', coverWide: '/covers/robotics-16x9.webp',
    pipeline: ['Gym environment', 'Reward', 'SAC on ClearML', 'Log to W&B', 'Benchmark vs PID'],
    metrics: [
      { value: 0.68, decimals: 2, suffix: ' mm', label: 'Mean RL error' },
      { value: 0.45, decimals: 2, suffix: ' mm', label: 'Mean PID error' },
      { value: 3, decimals: 0, suffix: 'M', label: 'Timesteps per run' },
    ],
    chapters: [
      {"id":"problem","title":"Problem","body":["The task was to move the pipette tip of a lab pipetting robot, an Opentrons OT-2, to a target point in a PyBullet simulation. The target stands in for a plant's root tip on a petri dish, and the controller had to land within 1 mm.","Each team member built and trained their own controller, and the team shared one hyperparameter search. My controller uses reinforcement learning, with a tuned PID controller as the benchmark."]},
      {"id":"approach","title":"Approach","body":["I wrapped the simulator as a Gymnasium environment. The first version used PPO with a reward of minus the distance. The policy approached the targets but often stalled a few millimetres short. Near the goal, a plain distance reward barely changes, so little signal is left for the last millimetre.","The final version uses SAC and a dense, progress-based reward: minus 10 times the distance, plus 100 times the progress since the last step, and a bonus of 50 within 1 mm or 100 within 0.5 mm. The problem was simplified to the X/Y plane with the height fixed. Training runs for 3M timesteps on a remote GPU queue, about 6 hours per run, with every run logged."]},
      {"id":"part","title":"My part","body":["The SAC controller is my own work: the environment, the reward, the training runs and the benchmark against PID. The hyperparameters came from the shared team search, and I used the best configuration."]},
      {"id":"results","title":"Results","body":["Benchmarked on three random targets, the SAC controller met the 1 mm requirement every time, with no overshoot. Its mean final error was 0.68 mm.","The PID controller was still more precise at 0.45 mm and settled much faster, in 0.3 s against 3.1 s. The integrated root-phenotyping pipeline therefore uses PID. The SAC policy learned the task from the reward alone, without a model of the robot."],"figures":[{"kind":"chart","src":"/work/robotics/sac-vs-pid.svg","alt":"Bar chart of final tip error in millimetres for SAC and PID on three targets and the mean. SAC is between 0.47 and 0.80 mm, PID between 0.41 and 0.49 mm, and both are below the 1 mm line.","wide":false},{"kind":"table","head":["Metric","SAC","PID"],"rows":[["Mean final error","0.68 mm","0.45 mm"],["Rise time","0.353 s","0.157 s"],["Settling time","3.053 s","0.314 s"],["Overshoot","0%","0%"]]}]},
      {"id":"other","title":"Also in robotics","body":["A Niryo arm that plays tic-tac-toe against a person was a team project in November 2025. The arm's camera finds the board and detects the red and blue pieces per cell, and a minimax player chooses the move. My part was the execution algorithm that turns the chosen move into a pick-and-place sequence, and help with the piece detection.","In January 2026 I ran exploratory experiments on a Unitree G1 humanoid: a tool to capture and replay arm and hand poses, and pose commands sent over ROS 2 to a whole-body controller that keeps the robot balanced. There are no measured results from this work."],"figures":[{"kind":"image","src":"/work/robotics/niryo-arm.webp","alt":"A blue Niryo robot arm on a table, with the tic-tac-toe board and pieces in front of it.","ratio":"16:9","wide":false}]},
      {"id":"next","title":"Limits and next","body":["The benchmark covers three targets, in simulation only. The tic-tac-toe arm and the humanoid work have no measured results, such as detection accuracy or success rates.","A larger set of targets and a run on real hardware would show whether the SAC policy holds up outside the simulator."]},
    ],
    writeup: 'https://github.com/leventestaub/portfolio/blob/main/robotics.md',
  },
];
