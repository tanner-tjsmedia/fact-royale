/* ===========================
   FACT ROYALE | Quiz Logic
   =========================== */

// ── Fun Facts ──────────────────────────────────────────
// 365 facts, one per day, cycling annually by day-of-year.
const FUN_FACTS = [
  "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
  "Oxford University is older than the Aztec Empire.",
  "A day on Venus is longer than a year on Venus.",
  "The shortest war in history lasted 38 to 45 minutes: the Anglo-Zanzibar War of 1896.",
  "Scotland's national animal is the unicorn.",
  "Nintendo was founded in 1889. Originally as a playing card company.",
  "The Eiffel Tower grows about 6 inches taller in summer due to thermal expansion.",
  "Honey never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs that was still edible.",
  "Bananas are berries, but strawberries are not.",
  "The inventor of the Pringles can is buried in one.",
  "Wombats are the only animals known to produce cube-shaped droppings.",
  "A bolt of lightning is five times hotter than the surface of the Sun.",
  "Octopuses have three hearts, nine brains, and blue blood.",
  "There are more possible games of chess than atoms in the observable universe.",
  "Alaska is simultaneously the westernmost and easternmost state in the US.",
  "The Great Wall of China is not visible from space with the naked eye. That's a persistent myth.",
  "The first known computer bug was a real bug: a moth found in a Harvard relay in 1947.",
  "The Hawaiian alphabet has only 13 letters.",
  "The average person walks roughly 100,000 miles in their lifetime. About four trips around the Earth.",
  "Sharks are older than trees. Sharks have existed ~450 million years; trees for only ~350 million.",
  "A group of flamingos is called a flamboyance.",
  "The word 'quiz' has no agreed-upon origin. Its etymology is genuinely unknown.",
  "Humans share about 60% of their DNA with bananas.",
  "Marie Curie's notebooks are still radioactive. Visitors must sign a waiver to view them.",
  "The total weight of all ants on Earth is roughly comparable to the total weight of all humans.",
  "It took more time to build Stonehenge than the entire span of the Roman Empire.",
  "The electric chair was invented by a dentist.",
  "The blob of toothpaste on a toothbrush is called a nurdle.",
  "Pope John Paul II was an honorary Harlem Globetrotter.",
  "A flock of crows is called a murder. A group of owls is called a parliament.",
  "The average cloud weighs about 1.1 million pounds.",
  "Cows have regional accents. Their moos differ depending on the herd they grew up in.",
  "The longest English word typed using only the top row of a keyboard is 'typewriter.'",
  "A group of pugs is called a grumble.",
  "Pineapples take about two years to grow, and each plant produces roughly one per year.",
  "The Statue of Liberty's full name is 'Liberty Enlightening the World.'",
  "The dot over a lowercase i or j is called a tittle.",
  "Butterflies taste with their feet.",
  "The total length of blood vessels in the human body is about 60,000 miles.",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "Mosquitoes are the deadliest animals on Earth, responsible for more human deaths than any other creature.",
  "The moon is drifting away from Earth at about 1.5 inches per year.",
  "There is a species of jellyfish considered biologically immortal. It can revert to its juvenile state.",
  "The average person spends about six months of their life waiting at red lights.",
  "Figs are pollinated by wasps that die inside the fig. You eat them too.",
  "It is impossible to hum while holding your nose closed.",
  "A single strand of spaghetti is called a spaghetto.",
  "The small pocket inside a jeans pocket was originally designed for pocket watches.",
  "Penguins propose to their mates with a pebble.",
  "There are more stars in the universe than grains of sand on all of Earth's beaches.",
  "The fingerprints of a koala are so similar to human fingerprints they have confused crime scene investigators.",
  "The world's oldest known recipe is for beer, from ancient Mesopotamia around 1800 BC.",
  "The word 'salary' comes from the Latin 'salarium'. Roman soldiers were sometimes paid in salt.",
  "There are more fake flamingos in the world than real ones.",
  "A snail can sleep for three years at a time.",
  "Rats laugh when tickled. But at a frequency humans can't hear without equipment.",
  "The voices of Mickey Mouse and Minnie Mouse were married to each other in real life.",
  "Sloths can hold their breath longer than dolphins. Up to 40 minutes.",
  "A group of cats is called a clowder.",
  "The hashtag symbol is officially called an octothorpe.",
  "Canada has more lakes than every other country in the world combined.",
  "No word in the English language rhymes with month, orange, silver, or purple.",
  "Blind people dream. Those blind from birth dream in sounds, smells, and touch rather than images.",
  "The lighter was invented before the match.",
  "The letter Q does not appear in the name of any US state.",
  "Humans are the only animals that blush.",
  "Apples float in water because they are 25% air.",
  "A group of hippos is called a bloat.",
  "Before toilet paper, people used everything from corn cobs to rags to leaves.",
  "The shortest complete sentence in English is 'Go.'",
  "Sea otters hold hands while sleeping so they don't drift apart.",
  "The world's oldest piece of chewing gum is about 9,000 years old.",
  "A dime has 118 ridges. A quarter has 119.",
  "The Mona Lisa has no eyebrows. It was fashionable in Renaissance Florence to shave them.",
  "Ancient Romans used urine as a mouthwash due to its ammonia content.",
  "The Hollywood sign originally read 'Hollywoodland.' The last four letters were removed in 1949.",
  "A group of jellyfish is called a smack.",
  "Venus is the only planet in our solar system that rotates clockwise.",
  "Elephants are the only animals that cannot jump.",
  "Bubble wrap was originally invented as wallpaper.",
  "Starfish have no brain and no blood. They pump seawater through their bodies instead.",
  "The tongue print of every person is unique, just like fingerprints.",
  "Pigeons can tell the difference between a Monet and a Picasso.",
  "The king of hearts is the only king in a standard deck of cards without a mustache.",
  "Almonds are a member of the peach family.",
  "A group of pandas is called an embarrassment.",
  "An ostrich's eye is bigger than its brain.",
  "The first oranges weren't orange. In tropical climates, ripe oranges stay green.",
  "Tigers have striped skin, not just striped fur. No two tigers have the same stripe pattern.",
  "A cat has 32 muscles in each ear.",
  "Hippos produce a natural sunscreen. A red oily substance that also acts as an antibiotic.",
  "The total number of possible ways to arrange a deck of 52 cards exceeds the number of atoms on Earth.",
  "Abraham Lincoln was a licensed bartender. He co-owned a tavern in Illinois.",
  "The first product to have a barcode scanned was a pack of Wrigley's chewing gum in 1974.",
  "Humans are bioluminescent. We emit light, but it's 1,000 times too faint to see.",
  "In 10 minutes, a hurricane releases more energy than all the world's nuclear weapons combined.",
  "A crocodile cannot stick its tongue out.",
  "The kangaroo cannot walk backwards.",
  "Water can boil and freeze at the same time. This is called the triple point.",
  "The word 'robot' comes from the Czech 'robota,' meaning forced labor or drudgery.",
  "A group of ravens is called a conspiracy.",
  "In space, astronauts cannot cry. Tears form spheres and float away instead of running down the face.",
  "Saturn is less dense than water. It would float if you had a big enough bathtub.",
  "A group of rhinos is called a crash.",
  "The tongue is the fastest-healing part of the human body.",
  "Crows remember human faces and hold grudges against people who have wronged them.",
  "The smell of freshly cut grass is actually a distress signal the grass releases when injured.",
  "A shrimp's heart is in its head.",
  "There is a town in Norway called Å.",
  "The word 'muscle' comes from the Latin for 'little mouse'. Romans thought flexing muscles looked like a mouse moving under skin.",
  "Turtles can breathe through their rear ends. It's called cloacal respiration.",
  "A group of hedgehogs is called a prickle.",
  "The average person will grow 590 miles of hair in their lifetime.",
  "The brain uses about 20% of the body's total energy, despite being only 2% of body weight.",
  "Coca-Cola would be green if the caramel coloring weren't added.",
  "Goldfish have a memory of at least three months. The 'three-second memory' is a myth.",
  "The national sport of Japan is not sumo. It's baseball.",
  "If you removed all the empty space in atoms making up every human on Earth, we'd all fit in a sugar cube.",
  "A group of ferrets is called a business.",
  "Sloths are three times stronger than humans, pound for pound.",
  "The sentence 'The quick brown fox jumps over the lazy dog' uses every letter of the English alphabet.",
  "The oldest living tree in the world is a bristlecone pine named Methuselah. Over 5,000 years old.",
  "Lightning strikes the Earth about 100 times per second.",
  "The longest recorded flight of a chicken is 13 seconds.",
  "Honey bees can recognize human faces.",
  "Hot water freezes faster than cold water under certain conditions. This is called the Mpemba effect.",
  "The human eye can distinguish approximately 10 million different colors.",
  "A day on Mars is 24 hours and 37 minutes. The closest to Earth's day of any planet.",
  "The first email was sent in 1971 by Ray Tomlinson to himself. He can no longer recall what it said.",
  "Surgeons who play video games make 37% fewer errors than surgeons who don't.",
  "The diameter of the Milky Way is about 100,000 light-years. Light takes 100,000 years to cross it.",
  "A group of butterflies is called a kaleidoscope.",
  "The human body contains enough iron to make a 3-inch nail.",
  "Antarctica is the driest, windiest, and coldest continent. And is technically a desert.",
  "The song 'Happy Birthday to You' was copyrighted for decades and only entered the public domain in 2016.",
  "Grapes explode when you put them in a microwave. Scientists actually studied this.",
  "A group of gorillas is called a troop.",
  "The woolly mammoth was still alive when the Great Pyramid was being built.",
  "One in every 5,000 North Atlantic lobsters is born blue.",
  "A group of giraffes is called a tower.",
  "The world record for the longest time without sleep is 11 days.",
  "The electric eel is not actually an eel. It's more closely related to carp and catfish.",
  "Humans are the only animals known to cook their food.",
  "The Empire State Building has its own zip code: 10118.",
  "Rubber bands last longer when refrigerated.",
  "A group of kangaroos is called a mob.",
  "The average person laughs about 13 times a day.",
  "Catfish have more taste buds than any other animal. Up to 175,000 across their entire body.",
  "Polar bears have black skin beneath their white fur.",
  "In ancient Egypt, both men and women wore eyeliner. Primarily to repel flies.",
  "A group of alligators is called a congregation.",
  "The longest time between two twins being born is 87 days.",
  "The tallest mountain on Earth measured from base to peak is Mauna Kea in Hawaii. Not Everest.",
  "The world's most expensive spice by weight is saffron.",
  "A group of foxes is called a skulk.",
  "The original Monopoly was designed to show how rents enrich landlords and impoverish tenants.",
  "Toilet paper orientation was specified in the 1891 patent: the sheet should go over the top.",
  "There is enough carbon in the human body to fill about 9,000 pencils.",
  "The word 'nerd' was first used in a Dr. Seuss book in 1950.",
  "Sloths only descend from trees about once a week. To urinate and defecate.",
  "The color orange was named after the fruit. Before oranges arrived in Europe, the color was called 'yellow-red.'",
  "A group of sharks is called a shiver.",
  "The sound of a whip cracking is a sonic boom. The tip breaks the sound barrier.",
  "Your body replaces most of its cells over 7 to 10 years, but neurons and lens cells last a lifetime.",
  "There are more microorganisms in a tablespoon of soil than there are people on Earth.",
  "The longest word in the English language is pneumonoultramicroscopicsilicovolcanoconiosis. A lung disease.",
  "The dot at the bottom of a question mark descends from a tiny 'o,' short for 'quaestio' (Latin for question).",
  "Humans share 99% of their DNA with chimpanzees. And about 85% with mice.",
  "The Great Barrier Reef is the largest living structure on Earth and is visible from space.",
  "The shortest flight in the world lasts about 90 seconds: between Westray and Papa Westray in Scotland.",
  "Lighters were invented before matches. Lighters appeared in 1823; safety matches not until 1844.",
  "M&Ms stand for Mars and Murrie. The two men who invented them.",
  "Identical twins don't have identical fingerprints.",
  "The human stomach completely renews its lining every 2 to 3 days to protect against its own acid.",
  "Your nose can detect over 1 trillion different smells.",
  "The longest English word without a repeated letter is 'uncopyrightable.'",
  "There is no sound in space. Sound requires a medium like air or water to travel.",
  "The 100 folds in a chef's hat traditionally represent 100 ways to cook an egg.",
  "Japan has more vending machines per capita than any other country.",
  "Ants don't sleep in the way humans do. They take hundreds of short naps per day.",
  "The world's bestselling book is the Bible. The second bestselling is 'Don Quixote.'",
  "A group of meerkats is called a mob.",
  "Every human being starts life as a single cell smaller than a grain of sand.",
  "The lifespan of a taste bud is about 10 days.",
  "Pigs cannot look up at the sky due to the anatomy of their neck.",
  "The first webcam was created to monitor a coffee pot at Cambridge University.",
  "Whale songs are gradually getting lower in pitch each year. Scientists aren't entirely sure why.",
  "The word 'budget' comes from the French 'bougette,' meaning a small leather bag.",
  "A group of sloths is called a bed.",
  "More people are killed by cows each year than by sharks.",
  "Squirrels forget where they've buried up to 74% of their nuts.",
  "The surface area of a human lung is roughly equal to a tennis court.",
  "The average person spends about a year of their life sitting on the toilet.",
  "Polar bears are predominantly left-pawed.",
  "The Voyager 1 spacecraft is the farthest human-made object from Earth. Now over 23 billion km away.",
  "The Sahara Desert was green and full of lakes as recently as 11,000 years ago.",
  "The human body glows in the dark. We emit biophotons far too faint for the eye to detect.",
  "Chocolate was once used as currency by the Aztecs.",
  "In 1969, Apollo 11 had less computing power than a modern pocket calculator.",
  "A strawberry is not a berry, but a tomato is. Botanically speaking.",
  "The brain is more active at night during sleep than during the day.",
  "Lobsters were once considered the food of the poor. American prisoners complained about being fed it too often.",
  "The average pencil can draw a line 35 miles long or write about 45,000 words.",
  "The Canary Islands are named after dogs, not birds. The Latin name was 'Canariae Insulae'. Islands of Dogs.",
  "In ancient Rome, being left-handed was considered sinister. 'Sinister' means left in Latin.",
  "Paper money was invented in China around the 7th century AD.",
  "Every time you shuffle a deck of cards, the order is almost certainly unique in human history.",
  "People who are blind from birth report seeing color in their dreams based on emotional associations.",
  "The first item ever sold on eBay was a broken laser pointer. The buyer knew it was broken.",
  "Turkeys can blush. Their heads turn red when excited or angry.",
  "The plastic tips on shoelaces are called aglets.",
  "Sound travels about four times faster through water than through air.",
  "A group of porcupines is called a prickle.",
  "The human thigh bone is stronger than concrete.",
  "In 1999, PayPal was named one of the top ten worst business ideas of the year.",
  "The oldest known living organism is a sea grass colony in the Mediterranean, estimated at 100,000 years old.",
  "Finland has more saunas per capita than any other country. About one for every two people.",
  "A group of turtles is called a bale.",
  "The world's shortest river is the D River in Oregon. 120 feet long.",
  "Seahorses are monogamous, mate for life, and hold tails while traveling together.",
  "Approximately 10% of all photos ever taken were taken in the past year.",
  "Olympus Mons on Mars is three times taller than Mount Everest.",
  "A group of penguins on land is called a waddle.",
  "The average person blinks over 10 million times a year.",
  "The Great Fire of London in 1666 destroyed 13,200 houses but killed fewer than 10 people.",
  "Ketchup was once sold in the US as medicine. Marketed as a cure for indigestion.",
  "A human sneeze travels at about 100 mph and can send 100,000 germs into the air.",
  "The first text message ever sent was 'Merry Christmas,' sent in December 1992.",
  "A group of otters is called a romp.",
  "Astronauts grow about 2 inches taller in space. The spine decompresses without gravity.",
  "Jellyfish have been around for over 500 million years, making them the oldest multi-organ animal.",
  "Cats can make over 100 different sounds. Dogs can make about 10.",
  "Every year, more people are killed by vending machines falling on them than by sharks.",
  "The platypus is one of the only mammals that produces venom. Males have venomous spurs on their hind legs.",
  "In the 1800s, people feared passenger trains would suffocate riders at 30 mph.",
  "A group of parrots is called a pandemonium.",
  "The moon has moonquakes. Triggered by Earth's gravitational pull.",
  "Beethoven was completely deaf when he composed his 9th Symphony.",
  "French was the official language of England for about 300 years after the Norman Conquest in 1066.",
  "Trees communicate through a network of fungal connections underground, sometimes called the 'Wood Wide Web.'",
  "The inventor of the World Wide Web, Tim Berners-Lee, gave it away for free.",
  "A group of frogs is called an army.",
  "The average human heart beats about 100,000 times per day.",
  "In the early 1900s, pink was considered masculine and blue was considered feminine.",
  "111,111,111 × 111,111,111 = 12,345,678,987,654,321.",
  "There are more Lego mini-figures in existence than there are people on Earth.",
  "Giraffes only sleep about 30 minutes per day. In short bursts of a few minutes.",
  "You cannot sneeze with your eyes open. The reflex forces them shut.",
  "In 1952, Albert Einstein was offered the presidency of Israel. He declined.",
  "Python the programming language was named after Monty Python, not the snake.",
  "The longest English word typed using only the left hand on a standard keyboard is 'stewardesses.'",
  "Every continent on Earth ends with the same letter it starts with. Except Antarctica.",
  "The Twitter bird is named Larry. After basketball player Larry Bird.",
  "More than 40% of adults sleep in the fetal position.",
  "Slugs have four noses.",
  "More Monopoly money is printed each year than real US currency.",
  "There are 293 ways to make change for a dollar in US coins.",
  "Roosters have a mechanism that partially blocks their own crow. Otherwise they'd deafen themselves.",
  "7% of all humans who have ever lived are alive today.",
  "Chameleons change color primarily to communicate emotions. Not to camouflage.",
  "James Harrison of Australia donated blood for 60 years. His rare antibodies have saved over 2.4 million babies.",
  "A raisin dropped in a glass of champagne will repeatedly rise and fall, carried by carbonation.",
  "The Eiffel Tower was meant to be temporary. It was scheduled to be torn down in 1909.",
  "Sand from the Sahara Desert regularly blows across the Atlantic and fertilizes the Amazon rainforest.",
  "In a room of 23 people, there is a 50% chance two share the same birthday.",
  "Tardigrades (water bears) can survive in a vacuum, extreme radiation, and temperatures near absolute zero.",
  "The Colosseum in Rome could be flooded to stage mock naval battles.",
  "A group of ladybugs is called a loveliness.",
  "Time moves faster at the top of a mountain than at sea level. Gravity slows time down.",
  "It would take about 1.3 million Earths to fill the volume of the Sun.",
  "The world's quietest room is an anechoic chamber in Minnesota. Most people can't tolerate it for more than 45 minutes.",
  "There is a volcano on Mars called Olympus Mons that is three times taller than Everest.",
  "The first selfie in history was taken in 1839 by Robert Cornelius, a Philadelphia photographer.",
  "Playing chess improves children's academic performance across subjects, according to multiple studies.",
  "There are more public libraries in the US than McDonald's.",
  "Ketchup was invented in China. Originally a fermented fish sauce called 'ke-tsiap.'",
  "A group of zebras is called a dazzle.",
  "A group of capybaras is called a herd. Capybaras are the world's largest rodents.",
  "The world record for the longest time holding breath underwater is over 24 minutes.",
  "A group of cockroaches is called an intrusion.",
  "The original name for the search engine Google was 'BackRub.'",
  "A group of crabs is called a cast.",
  "There is a species of ant that explodes itself to defend its colony. Camponotus saundersi.",
  "The average person will spend six months of their life dreaming.",
  "Chewing gum while cutting onions helps prevent tears by making you breathe through your mouth.",
  "A group of swans in flight is called a wedge.",
  "A group of badgers is called a cete.",
  "The human brain can process images seen for as little as 13 milliseconds.",
  "A group of deer is called a herd.",
  "Sneezing with your eyes open is physically possible but nearly impossible to do voluntarily.",
  "A group of hyenas is called a cackle.",
  "A group of armadillos is called a roll.",
  "A group of bears is called a sleuth.",
  "Glass is technically an amorphous solid. Not a liquid, despite the old myth.",
  "A group of parakeets is called a company.",
  "A group of turkeys is called a rafter.",
  "A group of horses is called a herd or a string.",
  "A group of goldfish is called a troubling.",
  "The inventor of intermittent windshield wipers fought Ford in court for 30 years and won $30 million.",
  "The moon causes tides not just in the ocean but in Earth's crust. The ground moves by several inches daily.",
  "Tardigrades have survived five mass extinction events.",
  "The average adult human body contains about 37 trillion cells.",
  "Elephants are the only animals known to recognize themselves in a mirror, alongside dolphins, great apes, and magpies.",
  "A newborn baby has about 270 bones. Adults have 206. Many fuse together as we grow.",
  "The longest recorded hiccup attack lasted 68 years.",
  "The 'airplane mode' setting got its name because early mobile signals actually interfered with aircraft instruments.",
  "A group of eagles is called a convocation.",
  "Hot air rises and cold air sinks. But in a supercell thunderstorm, air moves faster horizontally than vertically.",
  "The Amazon River discharges more water into the ocean than the next seven largest rivers combined.",
  "A group of monkeys is called a troop.",
  "The Mona Lisa was stolen from the Louvre in 1911 and missing for two years. Making it far more famous upon return.",
  "A group of wolves is called a pack.",
  "The bones of a pigeon weigh less than its feathers.",
  "Only two countries in the world have green in their flags that does not appear in a horizontal stripe: Brazil and Jamaica.",
  "A group of coyotes is called a band.",
  "The first alarm clock could only ring at 4 a.m.. Invented in 1787 by Levi Hutchins, who needed to wake for work.",
  "A group of lemurs is called a conspiracy.",
  "The blue whale is the loudest animal on Earth. Its calls can reach 188 decibels.",
  "A group of seagulls is called a colony.",
  "The word 'galaxy' comes from the Greek word for milk. The Milky Way looked like a stream of milk in the sky.",
  "A group of flamingos in flight is called a stand.",
  "The human nose warms and filters about 400 cubic feet of air per day.",
  "A group of dolphins is called a pod.",
  "Women blink about twice as often as men.",
  "A group of penguins in the water is called a raft.",
  "Newborn babies are color-blind at birth. They see primarily in black, white, and shades of gray.",
  "A group of eagles is called a convocation.",
  "The Great Pyramid of Giza was the world's tallest man-made structure for over 3,800 years.",
  "The first photograph of a person was taken in 1838. A man getting his shoes shined on a Paris boulevard.",
  "A group of whales is called a pod.",
  "If the human brain were a computer, it could perform about 38,000 trillion operations per second.",
  "A group of bees is called a swarm.",
  "Every year, over 4,000 people are injured by tea kettles in the UK.",
  "A group of camels is called a caravan.",
  "The number of atoms in a single grain of sand is greater than the number of grains of sand on Earth's beaches.",
  "A group of crows can plan for the future, use tools, and even play pranks on each other.",
  "A group of ants is called a colony.",
  "The human eye blinks 400 million times in a lifetime.",
  "A group of vultures circling in the air is called a kettle.",
  "Humans are technically closer in DNA to mushrooms than mushrooms are to plants.",
  "A group of finches is called a charm.",
  "The average American walks about 100,000 steps per week.",
  "There is a river in the Philippines that is navigable by ocean-going ships for 24 km. The Cagayan River.",
  "A group of lemurs is called a conspiracy.",
  "Polar ice caps reflect about 80% of the sunlight that hits them back into space.",
  "A group of mice is called a mischief.",
  "The human skeleton is completely renewed every 10 years. You're always growing new bones.",
  "A group of bats is called a colony or a cloud.",
  "The Sun accounts for 99.86% of all mass in our solar system.",
  "A group of squirrels is called a scurry.",
  "The ocean covers 71% of Earth's surface, but 95% of it remains unexplored.",
  "A group of pigs is called a sounder.",
  "Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.",
  "The word 'trivia' comes from the Latin 'trivium'. Where three roads meet, a public place for idle chatter.",
  "Hippos produce more milk than any other land mammal. Up to 100 liters per day.",
  "A group of ravens gathering to mob a predator is called an unkindness.",
  "The Eiffel Tower has a private apartment at the top. Gustave Eiffel kept it for himself.",
  "Elephants are the only animals that have a natural burial ritual for their dead.",
  "The first domain name ever registered was Symbolics.com, on March 15, 1985.",
  "A group of owlets is called a parliament in training.",
  "Honey badgers have been documented using tools. Dragging logs to climb over obstacles.",
  "The average person makes about 35,000 decisions every single day.",
  "Velcro was invented after a Swiss engineer noticed burrs sticking to his dog's fur.",
  "Crocodiles cannot chew. They swallow rocks to help grind food in their stomachs.",
  "The original Xbox was so heavy that FedEx required a special shipping waiver for it.",
];

function getDailyFunFact() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return FUN_FACTS[dayOfYear % FUN_FACTS.length];
}

// ── State ──────────────────────────────────────────────
let questions      = [];
let currentIndex   = 0;
let score          = 0;
let answered       = false;
let categoryScores = {}; // { "History": {correct:0, total:0}, ... }
let todayKey       = '';   // "2026-06-13"
let isArchivePlay  = false; // true when loading a past date via ?date= param
let activeQuizDate = '';    // the date key for the current quiz (today or archive)

// ── Helpers ────────────────────────────────────────────

function getTodayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getCategoryClass(category) {
  const c = category.toLowerCase();
  if (c.includes('history'))                        return 'cat-history';
  if (c.includes('sport'))                          return 'cat-sports';
  if (c.includes('music') || c.includes('movie'))   return 'cat-music';
  if (c.includes('geography') || c.includes('geo')) return 'cat-geography';
  if (c.includes('science') || c.includes('nature')) return 'cat-science';
  return 'cat-default';
}

function formatDate(key) {
  const [yyyy, mm, dd] = key.split('-');
  const d = new Date(yyyy, mm - 1, dd);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Screens ────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Streak ─────────────────────────────────────────────

function getStreak() {
  return parseInt(localStorage.getItem('fr_streak') || '0');
}

function getLastPlayed() {
  return localStorage.getItem('fr_lastPlayed') || '';
}

function saveResult(finalScore) {
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  const lastPlayed = getLastPlayed();
  let streak = getStreak();

  if (lastPlayed === yesterday) {
    streak += 1;
  } else if (lastPlayed !== todayKey) {
    streak = 1;
  }

  localStorage.setItem('fr_streak',       streak);
  localStorage.setItem('fr_lastPlayed',   todayKey);
  localStorage.setItem('fr_lastScore',    `${finalScore}/${questions.length}`);
  localStorage.setItem('fr_categoryScores', JSON.stringify(categoryScores));

  return streak;
}

function alreadyPlayedToday() {
  return getLastPlayed() === todayKey;
}

// ── Landing Screen ─────────────────────────────────────

function setupLanding(data) {
  document.getElementById('landing-date').textContent   = formatDate(todayKey);

  const streak = getStreak();
  const streakEl = document.getElementById('landing-streak');
  streakEl.innerHTML = streak > 0 ? `<span class="fr-icon fr-icon-sm" style="color:var(--gold,#d4af37)">${ICONS.flame}</span> ${streak} day streak` : 'Start your streak!';

  // Category pills
  const cats = [...new Set(data.questions.map(q => q.category))];
  const pillsEl = document.getElementById('landing-categories');
  pillsEl.innerHTML = cats.map(c =>
    `<span class="pill ${getCategoryClass(c)}">${c}</span>`
  ).join('');

  // Set date on daily card
  const dateCardEl = document.getElementById('landing-date-card');
  if (dateCardEl) dateCardEl.textContent = formatDate(todayKey);

  // Already played today?
  if (alreadyPlayedToday()) {
    // Change play buttons to "View Results" instead of hiding them
    ['btn-start-hero', 'btn-start-section'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = id === 'btn-start-hero' ? 'View My Results' : 'View Results';
      el.addEventListener('click', showResultsFromStorage);
    });
    document.getElementById('already-played-msg').style.display = 'block';
    document.getElementById('final-score-replay').textContent =
      `Score: ${localStorage.getItem('fr_lastScore')}`;
    // Catch-up tiles (fires if auth already resolved; also called from auth.js)
    populateCatchUpOnLanding();
  } else {
    ['btn-start-hero', 'btn-start-section'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', startQuiz);
    });
  }

  // Email form — submits to Google Sheets via Apps Script
  const SIGNUP_URL = 'https://script.google.com/macros/s/AKfycbzCboRQs6V2YbKuUTSnGIdMXZIPlmYl2jLZVMnbvapVNlDIOKlQgLmsW1Qqjsc1BkoK/exec';

  const form = document.getElementById('notify-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const firstName = (form.querySelector('input[name="firstName"]')?.value || '').trim();
      const lastName  = (form.querySelector('input[name="lastName"]')?.value  || '').trim();
      const email     = (form.querySelector('input[type="email"]')?.value     || '').trim();

      if (!email) return;

      fetch(SIGNUP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: new URLSearchParams({ email, firstName, lastName, source: 'notify-form' })
      });

      // Show confirmation immediately (optimistic — submission is reliable)
      form.style.display = 'none';
      document.getElementById('notify-confirm').style.display = 'block';
    });
  }
}

// ── Quiz ───────────────────────────────────────────────

// ── Sync landing to already-played state ───────────────
// Called when returning home after completing today's daily quiz.
// Clones buttons to clear all listeners, then sets them to "View Results".
function syncLandingAlreadyPlayed() {
  ['btn-start-hero', 'btn-start-section'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.textContent = id === 'btn-start-hero' ? 'View My Results' : 'View Results';
    clone.addEventListener('click', showResultsFromStorage);
  });
  const alreadyEl = document.getElementById('already-played-msg');
  if (alreadyEl) {
    alreadyEl.style.display = 'block';
    const scoreEl = document.getElementById('final-score-replay');
    if (scoreEl) scoreEl.textContent = `Score: ${localStorage.getItem('fr_lastScore')}`;
  }
  // Update streak banner immediately from localStorage — don't wait for async Firestore.
  // submitScoreToFirebase is fire-and-forget; by the time the user hits Back to Home,
  // the Firestore write may not have resolved. localStorage is always current after saveResult().
  if (typeof updateStreakBanner === 'function') {
    const streak = parseInt(localStorage.getItem('fr_streak') || '0');
    updateStreakBanner(streak, true /* alreadyPlayed */, false /* streakBroken */);
  }
  // Refresh catch-up tiles if user is logged in
  populateCatchUpOnLanding();
}

function startQuiz() {
  // Prevent replaying today's daily quiz if already completed
  if (!isArchivePlay && alreadyPlayedToday()) {
    showResultsFromStorage();
    return;
  }

  currentIndex = 0;
  score        = 0;
  answered     = false;
  categoryScores = {};

  // Init category score trackers
  questions.forEach(q => {
    if (!categoryScores[q.category]) {
      categoryScores[q.category] = { correct: 0, total: 0 };
    }
    categoryScores[q.category].total++;
  });

  showScreen('screen-quiz');
  renderQuestion();
}

function renderQuestion() {
  const q = questions[currentIndex];
  answered = false;

  // Progress
  const pct = (currentIndex / questions.length) * 100;
  document.getElementById('progress-bar').style.width  = `${pct}%`;
  document.getElementById('progress-text').textContent = `${currentIndex + 1} / ${questions.length}`;

  // Streak in header
  const streak = getStreak();
  document.getElementById('quiz-streak').innerHTML = streak > 0 ? `<span class="fr-icon fr-icon-sm" style="color:var(--gold,#d4af37)">${ICONS.flame}</span> ${streak}` : '';

  // Category tag
  const catEl = document.getElementById('q-category');
  catEl.textContent  = q.category;
  catEl.className    = `category-tag ${getCategoryClass(q.category)}`;

  // Question
  document.getElementById('q-text').textContent = q.question;

  // Options — shuffle them each render
  const opts   = shuffle(q.options);
  const grid   = document.getElementById('options-grid');
  grid.innerHTML = '';

  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className   = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(opt, q));
    grid.appendChild(btn);
  });

  // Hide feedback
  document.getElementById('feedback-box').style.display = 'none';

  // Slide-in entrance animation
  const qCard = document.querySelector('.question-card');
  if (qCard) {
    qCard.classList.remove('entering', 'exiting');
    void qCard.offsetWidth; // force reflow
    qCard.classList.add('entering');
  }
}

function handleAnswer(selected, q) {
  if (answered) return;
  answered = true;

  const isCorrect = selected === q.answer;

  // Highlight all option buttons
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === q.answer) {
      btn.classList.add('correct');
    } else if (btn.textContent === selected && !isCorrect) {
      btn.classList.add('wrong');
    }
  });

  // Track score
  if (isCorrect) {
    score++;
    categoryScores[q.category].correct++;
  }

  // Feedback
  const feedbackBox    = document.getElementById('feedback-box');
  const feedbackResult = document.getElementById('feedback-result');
  const explanation    = document.getElementById('feedback-explanation');
  const hookBox        = document.getElementById('memory-hook');
  const hookText       = document.getElementById('hook-text');

  feedbackResult.textContent = isCorrect ? '✓ Correct!' : `✗ The answer was: ${q.answer}`;
  feedbackResult.className   = `feedback-result ${isCorrect ? 'correct' : 'wrong'}`;
  explanation.textContent    = q.explanation;

  if (q.memory_hook) {
    hookText.textContent        = q.memory_hook;
    hookBox.style.display       = 'block';
  } else {
    hookBox.style.display = 'none';
  }

  feedbackBox.style.display = 'block';

  // Wire up Next button
  const btnNext = document.getElementById('btn-next');
  const isLast  = currentIndex === questions.length - 1;
  btnNext.textContent = isLast ? 'See Results →' : 'Next Question →';

  btnNext.onclick = () => {
    const qCard = document.querySelector('.question-card');
    const advance = () => {
      currentIndex++;
      if (currentIndex >= questions.length) {
        showResults();
      } else {
        renderQuestion();
      }
    };
    if (qCard) {
      qCard.classList.add('exiting');
      setTimeout(advance, 280);
    } else {
      advance();
    }
  };
}

// ── Play Tracking (anonymous + signed-in) ──────────────

function logPlayToFirestore(finalScore, total) {
  if (typeof db === 'undefined') return;
  try {
    const isSignedIn = !!(typeof firebase !== 'undefined' &&
                          firebase.auth &&
                          firebase.auth().currentUser);
    db.collection('plays').add({
      date:      todayKey,
      score:     finalScore,
      total:     total,
      signed_in: isSignedIn,
      ts:        firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { /* fire-and-forget */ }
}

// ── Results ────────────────────────────────────────────

function getResultsTitle(pct, streak) {
  let title;
  const crownSvg  = `<span class="fr-icon fr-icon-sm" style="color:var(--gold,#d4af37);vertical-align:middle">${ICONS.crown}</span>`;
  const flameSvg  = `<span class="fr-icon fr-icon-sm" style="color:var(--gold,#d4af37);vertical-align:middle">${ICONS.flame}</span>`;
  const trophysvg = `<span class="fr-icon fr-icon-sm" style="color:var(--gold,#d4af37);vertical-align:middle">${ICONS.trophy}</span>`;
  if (pct === 1)       title = `Perfect Score! ${crownSvg}`;
  else if (pct >= 0.8) title = 'Royale performance!';
  else if (pct >= 0.6) title = 'Solid showing!';
  else if (pct >= 0.4) title = 'Room to grow. Keep playing!';
  else                 title = 'Nice effort!';

  if (streak >= 100) return `${title}  |  ${streak} days straight ${trophysvg}`;
  if (streak >= 50)  return `${title}  |  50 days running ${flameSvg}`;
  if (streak >= 30)  return `${title}  |  One month in ${flameSvg}`;
  if (streak >= 14)  return `${title}  |  ${streak} days straight ${flameSvg}`;
  if (streak >= 10)  return `${title}  |  ${streak}-day streak ${flameSvg}`;
  if (streak >= 7)   return `${title}  |  One week strong ${flameSvg}`;
  return title;
}

function showResults() {
  // Daily play: update local streak + log metrics
  // Archive play: skip both (don't affect streak, don't log to anon metrics)
  let streak = getStreak();
  if (!isArchivePlay) {
    streak = saveResult(score);
    logPlayToFirestore(score, questions.length);
  }

  // Submit to Firebase (auth.js handles the guard; isArchive skips streak+leaderboard)
  if (typeof submitScoreToFirebase === 'function') {
    submitScoreToFirebase(score, questions.length, categoryScores, activeQuizDate, isArchivePlay);
  }

  showScreen('screen-results');

  // Title
  if (isArchivePlay) {
    document.getElementById('results-title').textContent =
      getArchiveResultsTitle(score / questions.length);
  } else {
    document.getElementById('results-title').innerHTML =
      getResultsTitle(score / questions.length, streak);
  }

  // Score display with reveal animation
  const scoreEl = document.getElementById('score-display');
  scoreEl.innerHTML = `${score}<span> / ${questions.length}</span>`;
  scoreEl.classList.remove('reveal');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('reveal');

  // Level-up banner (set by mastery.js → updateCategoryMastery)
  const levelUpEl = document.getElementById('levelup-banner');
  if (levelUpEl) {
    try {
      const levelUps = JSON.parse(localStorage.getItem('fr_levelUps') || '[]');
      if (levelUps.length > 0) {
        levelUpEl.innerHTML = levelUps.map(lu =>
          `<div class="levelup-item">
            <span class="levelup-icon">${lu.to.icon}</span>
            <div>
              <div class="levelup-text">Ranked up in ${lu.category}!</div>
              <div class="levelup-sub">${lu.from.icon} ${lu.from.name} &rarr; ${lu.to.icon} ${lu.to.name}</div>
            </div>
          </div>`
        ).join('');
        levelUpEl.style.display = 'block';
        localStorage.removeItem('fr_levelUps');
      } else {
        levelUpEl.style.display = 'none';
      }
    } catch (e) { levelUpEl.style.display = 'none'; }
  }

  // Category breakdown
  const breakdown = document.getElementById('category-breakdown');
  breakdown.innerHTML = '';
  Object.entries(categoryScores).forEach(([cat, s]) => {
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `
      <span class="breakdown-label">${cat}</span>
      <span class="breakdown-score">${s.correct} / ${s.total}</span>
    `;
    breakdown.appendChild(row);
  });

  // Streak row — daily only
  if (!isArchivePlay && streak > 1) {
    const streakRow = document.createElement('div');
    streakRow.className = 'breakdown-row';
    streakRow.innerHTML = `
      <span class="breakdown-label"><span class="fr-icon fr-icon-xs" style="color:var(--gold,#d4af37);vertical-align:middle">${ICONS.flame}</span> Streak</span>
      <span class="breakdown-score">${streak} days</span>
    `;
    breakdown.appendChild(streakRow);
  }

  // Archive notice (hidden for daily plays)
  const archiveNoticeEl = document.getElementById('archive-results-notice');
  if (archiveNoticeEl) {
    archiveNoticeEl.style.display = isArchivePlay ? 'block' : 'none';
  }

  // Catch-up tiles (async — fills in after render)
  if (typeof currentUser !== 'undefined' && currentUser) {
    showCatchUpSection();
  }

  // Sign-up nudge — only for anonymous users on daily plays
  const nudgeEl = document.getElementById('signup-nudge');
  if (nudgeEl) {
    const isLoggedIn = !!(typeof firebase !== 'undefined' &&
                          firebase.auth &&
                          firebase.auth().currentUser);
    nudgeEl.style.display = (isLoggedIn || isArchivePlay) ? 'none' : 'block';
    if (!isLoggedIn && !isArchivePlay) {
      const nudgeBtn = document.getElementById('btn-nudge-signup');
      if (nudgeBtn) nudgeBtn.onclick = () => {
        const modal = document.getElementById('auth-modal');
        if (modal) {
          modal.style.display = 'flex';
          const signupTab = document.getElementById('tab-signup');
          if (signupTab) signupTab.click();
        }
      };
    }
  }

  // Fun fact
  document.getElementById('fun-fact-text').textContent = getDailyFunFact();

  // Share
  document.getElementById('btn-share').onclick = shareScore;

  // Home button — archive goes to homepage root, daily re-syncs landing + shows it
  document.getElementById('btn-home').onclick = () => {
    if (isArchivePlay) {
      window.location.href = '/';
    } else {
      syncLandingAlreadyPlayed();
      showScreen('screen-landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof loadLeaderboard === 'function') loadLeaderboard();
    }
  };

  // Comeback message
  const comebackEl = document.querySelector('.comeback-msg');
  if (comebackEl) {
    comebackEl.textContent = isArchivePlay
      ? 'Come back tomorrow for a fresh quiz!'
      : 'New quiz drops tomorrow. See you then.';
  }
}

// ── Replay results from localStorage (already-played flow) ─
function showResultsFromStorage() {
  // Parse stored score string ("8/10" format)
  const stored = localStorage.getItem('fr_lastScore') || '0/10';
  const parts   = stored.split('/');
  const storedScore = parseInt(parts[0]) || 0;
  const storedTotal = parseInt(parts[1]) || 10;

  // Restore in-memory state so sharing works correctly
  score = storedScore;
  try {
    categoryScores = JSON.parse(localStorage.getItem('fr_categoryScores') || '{}');
  } catch (e) {
    categoryScores = {};
  }

  showScreen('screen-results');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Title
  const streak = getStreak();
  document.getElementById('results-title').innerHTML =
    getResultsTitle(storedScore / storedTotal, streak);

  document.getElementById('score-display').innerHTML =
    `${storedScore}<span> / ${storedTotal}</span>`;

  // Category breakdown
  const breakdown = document.getElementById('category-breakdown');
  breakdown.innerHTML = '';
  Object.entries(categoryScores).forEach(([cat, s]) => {
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `<span class="breakdown-label">${cat}</span>
                     <span class="breakdown-score">${s.correct} / ${s.total}</span>`;
    breakdown.appendChild(row);
  });

  if (streak > 1) {
    const streakRow = document.createElement('div');
    streakRow.className = 'breakdown-row';
    streakRow.innerHTML = `<span class="breakdown-label">🔥 Streak</span>
                           <span class="breakdown-score">${streak} days</span>`;
    breakdown.appendChild(streakRow);
  }

  // Hide signup nudge for returning players who are signed in
  const nudgeEl = document.getElementById('signup-nudge');
  if (nudgeEl) {
    const isLoggedIn = !!(typeof firebase !== 'undefined' &&
                          firebase.auth && firebase.auth().currentUser);
    nudgeEl.style.display = isLoggedIn ? 'none' : 'block';
    if (!isLoggedIn) {
      const nudgeBtn = document.getElementById('btn-nudge-signup');
      if (nudgeBtn) nudgeBtn.onclick = () => {
        const modal = document.getElementById('auth-modal');
        if (modal) {
          modal.style.display = 'flex';
          const signupTab = document.getElementById('tab-signup');
          if (signupTab) signupTab.click();
        }
      };
    }
  }

  document.getElementById('fun-fact-text').textContent = getDailyFunFact();
  document.getElementById('btn-share').onclick = shareScore;

  document.getElementById('btn-home').onclick = () => {
    showScreen('screen-landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof loadLeaderboard === 'function') loadLeaderboard();
  };
}

// ── Archive Results Title ──────────────────────────────
function getArchiveResultsTitle(pct) {
  if (pct >= 0.917) return 'Perfect catch-up!';
  if (pct >= 0.75)  return 'Nice catch-up play!';
  if (pct >= 0.5)   return 'Solid catch-up!';
  return 'Caught up!';
}

// ── Catch-Up Section (results screen) ─────────────────
// Shows a single CTA to the oldest missed quiz in the free window.
// Called after showResults() when user is logged in.
async function showCatchUpSection() {
  const sectionEl = document.getElementById('catchup-section');
  if (!sectionEl) return;
  if (typeof currentUser === 'undefined' || !currentUser) return;
  if (typeof getCompletedDates !== 'function') return;

  try {
    const completedDates = await getCompletedDates(currentUser.uid);

    // Scan from oldest to newest within the free window
    let oldestMissed = null;
    let missedCount  = 0;
    for (let i = ARCHIVE_FREE_DAYS; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (dateKey === activeQuizDate) continue; // skip what we just played
      if (!completedDates.includes(dateKey)) {
        if (!oldestMissed) oldestMissed = dateKey;
        missedCount++;
      }
    }

    if (!oldestMissed) {
      sectionEl.innerHTML = `
        <div class="catchup-complete">
          <span class="catchup-complete-icon">🎉</span>
          <span>All caught up this week!</span>
        </div>`;
      sectionEl.style.display = 'block';
      return;
    }

    const plural = missedCount > 1 ? `${missedCount} quizzes` : '1 quiz';
    sectionEl.innerHTML = `
      <div class="catchup-cta-wrap">
        <p class="catchup-cta-label">You have ${plural} waiting from this week</p>
        <a href="/?date=${oldestMissed}&autostart=1" class="btn-catchup">Play Missed Quizzes &#8594;</a>
        <p class="catchup-cta-note">Counts toward mastery, not streak or leaderboard.</p>
      </div>`;
    sectionEl.style.display = 'block';
  } catch (err) {
    console.error('Catch-up section error:', err);
  }
}

// ── Catch-Up CTA on Landing ────────────────────────────
// Shows for ALL logged-in users (not just already-played).
// Missed quizzes → single button to oldest missed date.
// All caught up → "Come back tomorrow" message.
// Called from auth.js onAuthStateChanged + syncLandingAlreadyPlayed().
async function populateCatchUpOnLanding() {
  if (isArchivePlay) return;
  const sectionEl = document.getElementById('catchup-landing');
  if (!sectionEl) return;
  if (typeof currentUser === 'undefined' || !currentUser) return;
  if (typeof getCompletedDates !== 'function') return;

  try {
    const completedDates = await getCompletedDates(currentUser.uid);

    // Only show catch-up on the landing if the user has already played today.
    // Before today's quiz is done, keep the focus on today — no distractions.
    const playedToday = alreadyPlayedToday() || completedDates.includes(todayKey);
    if (!playedToday) return;

    let oldestMissed = null;
    let missedCount  = 0;
    for (let i = ARCHIVE_FREE_DAYS; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!completedDates.includes(dateKey)) {
        if (!oldestMissed) oldestMissed = dateKey;
        missedCount++;
      }
    }

    if (!oldestMissed) {
      sectionEl.innerHTML = `<p class="catchup-all-done">All caught up! New quiz drops tomorrow.</p>`;
      sectionEl.style.display = 'block';
      return;
    }

    const plural = missedCount > 1 ? `${missedCount} quizzes` : '1 quiz';
    sectionEl.innerHTML = `<a href="/?date=${oldestMissed}&autostart=1" class="btn-catchup">Play Missed Quizzes (${plural}) &#8594;</a>`;
    sectionEl.style.display = 'block';
  } catch (err) {
    console.error('Catch-up landing error:', err);
  }
}

// ── Archive: Locked Screen ─────────────────────────────
function showArchiveLockedScreen(dateStr) {
  const landingCard = document.querySelector('#screen-noquiz .landing-card');
  if (landingCard) {
    const dateDisplay = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? formatDate(dateStr) : dateStr;
    landingCard.innerHTML = `
      <div class="crown">&#9819;</div>
      <h1 class="logo">Fact Royale</h1>
      <p class="tagline">The quiz from <strong>${dateDisplay}</strong> is outside your free window.</p>
      <p style="margin-top:0.5rem;color:var(--text-muted);font-size:0.9em;">The last ${ARCHIVE_FREE_DAYS} days are free to replay. Older archives coming with premium.</p>
      <a href="/" class="btn-hero" style="display:inline-block;margin-top:1.5rem;">Back to Today</a>
    `;
  }
  showScreen('screen-noquiz');
}

// ── Archive: Already-Played Screen ────────────────────
function showArchiveAlreadyPlayedScreen() {
  showScreen('screen-results');
  document.getElementById('results-title').textContent = "You've already played this one!";
  document.getElementById('score-display').innerHTML   = '';

  const breakdown = document.getElementById('category-breakdown');
  if (breakdown) {
    breakdown.innerHTML = `<p class="archive-already-msg">Check your mastery page to see how this date contributed to your progress.</p>`;
  }

  const archiveNoticeEl = document.getElementById('archive-results-notice');
  if (archiveNoticeEl) archiveNoticeEl.style.display = 'block';

  const shareBtn = document.getElementById('btn-share');
  if (shareBtn) shareBtn.style.display = 'none';

  document.getElementById('btn-home').onclick = () => { window.location.href = '/'; };

  const comebackEl = document.querySelector('.comeback-msg');
  if (comebackEl) comebackEl.textContent = 'Play other dates below!';

  if (typeof currentUser !== 'undefined' && currentUser) showCatchUpSection();
}

// ── Archive: Landing Setup ─────────────────────────────
function setupArchiveLanding(data) {
  document.getElementById('landing-date').textContent = formatDate(activeQuizDate);

  // Category pills
  const cats    = [...new Set(data.questions.map(q => q.category))];
  const pillsEl = document.getElementById('landing-categories');
  if (pillsEl) pillsEl.innerHTML = cats.map(c =>
    `<span class="pill ${getCategoryClass(c)}">${c}</span>`
  ).join('');

  const dateCardEl = document.getElementById('landing-date-card');
  if (dateCardEl) dateCardEl.textContent = formatDate(activeQuizDate);

  // Streak badge — show current streak (don't modify)
  const streakEl = document.getElementById('landing-streak');
  const streak   = getStreak();
  if (streakEl) {
    streakEl.innerHTML = streak > 0
      ? `<span class="fr-icon fr-icon-sm" style="color:var(--gold,#d4af37)">${ICONS.flame}</span> ${streak} day streak`
      : '';
  }

  // Override play buttons
  ['btn-start-hero', 'btn-start-section'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = `Play ${formatDate(activeQuizDate)} Quiz`;
    el.addEventListener('click', startArchiveQuiz);
  });

  // Use already-played-msg for the archive notice
  const noticeEl = document.getElementById('already-played-msg');
  if (noticeEl) {
    noticeEl.style.display = 'block';
    noticeEl.innerHTML = `<span class="archive-landing-badge">Catch-Up Quiz</span> Scores count toward mastery, not streak or leaderboard.`;
  }
}

// ── Archive: Start Quiz (with auth + dupe guard) ───────
async function startArchiveQuiz() {
  // Require login
  if (typeof currentUser === 'undefined' || !currentUser) {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.style.display = 'flex';
      const signupTab = document.getElementById('tab-signup');
      if (signupTab) signupTab.click();
    }
    return;
  }

  // Block replaying already-completed dates
  try {
    const completedDates = await getCompletedDates(currentUser.uid);
    if (completedDates.includes(activeQuizDate)) {
      showArchiveAlreadyPlayedScreen();
      return;
    }
  } catch (e) {
    console.warn('completedDates check failed, proceeding:', e);
  }

  startQuiz();
}

// ── Score Card Sharing ─────────────────────────────────

let shareFormat = 'story';

const CARD_SIZES = {
  story:  { w: 540, h: 960 },
  wide:   { w: 800, h: 450 },
  square: { w: 540, h: 540 }
};

function getShareData() {
  const rankEl = document.getElementById('results-rank-pct');
  const rank = rankEl ? rankEl.textContent.trim() : '';
  return {
    score,
    total: questions.length,
    streak: getStreak(),
    date: formatDate(activeQuizDate),
    rank,
    categories: Object.entries(categoryScores).map(([cat, s]) => ({
      name: cat, correct: s.correct, total: s.total
    }))
  };
}

function openShareModal() {
  const modal = document.getElementById('share-modal');
  if (!modal) return;
  shareFormat = 'story';
  modal.querySelectorAll('.share-fmt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.format === 'story');
  });
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  renderShareCard();
}

function closeShareModal() {
  const modal = document.getElementById('share-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

async function renderShareCard() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const { w, h } = CARD_SIZES[shareFormat];
  canvas.width  = w;
  canvas.height = h;
  await document.fonts.ready;
  const ctx  = canvas.getContext('2d');
  const data = getShareData();
  if (shareFormat === 'story')  drawStoryCard(ctx, w, h, data);
  if (shareFormat === 'wide')   drawWideCard(ctx, w, h, data);
  if (shareFormat === 'square') drawSquareCard(ctx, w, h, data);

  // Scale canvas display to fit inside the modal without overflow.
  // Canvas width/height attrs control drawing resolution; CSS controls display size.
  const wrap   = canvas.parentElement;
  const maxW   = (wrap ? wrap.offsetWidth : 500) - 4; // 4px breathing room
  const maxH   = 400;
  const scale  = Math.min(maxW / w, maxH / h, 1); // never upscale
  canvas.style.width  = Math.round(w * scale) + 'px';
  canvas.style.height = Math.round(h * scale) + 'px';
}

// ── Canvas helpers ─────────────────────────────────────

function drawBg(ctx, w, h, stops) {
  const grad = ctx.createLinearGradient(0, 0, w * 0.65, h);
  stops.forEach(([pos, color]) => grad.addColorStop(pos, color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawGlow(ctx, cx, cy, r, alpha) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(240,192,64,${alpha})`);
  g.addColorStop(1,  'rgba(240,192,64,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cx + r, cy + r);
}

function drawHLine(ctx, w, y, margin) {
  const m = margin || w * 0.1;
  ctx.save();
  ctx.strokeStyle = 'rgba(240,192,64,0.22)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(m, y);
  ctx.lineTo(w - m, y);
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, rw, rh, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + rw - r, y);
  ctx.arcTo(x + rw, y,      x + rw, y + r,      r);
  ctx.lineTo(x + rw, y + rh - r);
  ctx.arcTo(x + rw, y + rh,  x + r,  y + rh,     r);
  ctx.lineTo(x + r,  y + rh);
  ctx.arcTo(x,       y + rh,  x,      y + rh - r, r);
  ctx.lineTo(x,      y + r);
  ctx.arcTo(x,       y,       x + r,  y,           r);
  ctx.closePath();
}

function getCatStyle(name) {
  const n = name.toLowerCase();
  if (n.includes('history'))                          return { bg: 'rgba(245,158,11,0.2)',  text: '#f59e0b' };
  if (n.includes('sport'))                            return { bg: 'rgba(59,130,246,0.2)',   text: '#60a5fa' };
  if (n.includes('geography') || n.includes('geo'))   return { bg: 'rgba(34,211,238,0.2)',   text: '#22d3ee' };
  if (n.includes('science') || n.includes('nature'))  return { bg: 'rgba(74,222,128,0.2)',   text: '#4ade80' };
  return                                                     { bg: 'rgba(168,85,247,0.2)',   text: '#c084fc' };
}

// Two-row pill layout for square card — abbreviated names, no overflow
function drawTwoRowPills(ctx, w, startY, categories) {
  const pillH = 26, padX = 10, gapX = 7, gapY = 7;
  ctx.font = '600 12px Nunito, sans-serif';

  const abbrev = n => {
    if (n.includes('Science') || n.includes('Nature')) return 'Science';
    if (n.includes('Music') || n.includes('Movies') || n.includes('Pop')) return 'Music';
    if (n.includes('Geo')) return 'Geo';
    if (n.length <= 9) return n;
    return n.slice(0, 8) + '…';
  };

  const pills = categories.map(cat => {
    const label = `${abbrev(cat.name)}  ${cat.correct}/${cat.total}`;
    const pw = ctx.measureText(label).width + padX * 2;
    return { ...cat, label, pw, style: getCatStyle(cat.name) };
  });

  const mid = Math.ceil(pills.length / 2);
  const rows = [pills.slice(0, mid), pills.slice(mid)];

  let y = startY;
  ctx.textAlign = 'center';
  rows.forEach(row => {
    const rowW = row.reduce((s, p) => s + p.pw, 0) + gapX * (row.length - 1);
    let x = (w - rowW) / 2;
    row.forEach(pill => {
      roundRect(ctx, x, y, pill.pw, pillH, 8);
      ctx.fillStyle = pill.style.bg;   ctx.fill();
      ctx.fillStyle = pill.style.text;
      ctx.fillText(pill.label, x + pill.pw / 2, y + pillH * 0.67);
      x += pill.pw + gapX;
    });
    y += pillH + gapY;
  });
}

function drawPills(ctx, totalW, centerY, categories) {
  const pillH = 38, padX = 14, gap = 12;
  ctx.font = '700 15px Nunito, sans-serif';
  const pills = categories.map(cat => {
    const label = `${cat.name}  ${cat.correct}/${cat.total}`;
    const pw    = ctx.measureText(label).width + padX * 2;
    return { ...cat, label, pw, style: getCatStyle(cat.name) };
  });
  const totalW2 = pills.reduce((s, p) => s + p.pw, 0) + gap * (pills.length - 1);
  let x = (totalW - totalW2) / 2;
  ctx.textAlign = 'center';
  pills.forEach(pill => {
    roundRect(ctx, x, centerY - pillH / 2, pill.pw, pillH, 10);
    ctx.fillStyle = pill.style.bg;
    ctx.fill();
    ctx.fillStyle = pill.style.text;
    ctx.fillText(pill.label, x + pill.pw / 2, centerY + 5);
    x += pill.pw + gap;
  });
}

function drawDotGrid(ctx, w, h) {
  ctx.fillStyle = 'rgba(240,192,64,0.035)';
  for (let gx = 22; gx < w; gx += 28) {
    for (let gy = 22; gy < h; gy += 28) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTopAccent(ctx, w) {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0,   'rgba(240,192,64,0)');
  g.addColorStop(0.5, 'rgba(240,192,64,0.65)');
  g.addColorStop(1,   'rgba(240,192,64,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, 3);
}

function drawScoreRing(ctx, cx, cy, r) {
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
  glow.addColorStop(0,   'rgba(240,192,64,0.10)');
  glow.addColorStop(0.6, 'rgba(240,192,64,0.04)');
  glow.addColorStop(1,   'rgba(240,192,64,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.strokeStyle = 'rgba(240,192,64,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(240,192,64,0.24)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawPctBadge(ctx, cx, cy, score, total) {
  const pct = Math.round((score / total) * 100);
  const isHigh = pct >= 80, isMid = pct >= 60;
  const bg  = isHigh ? 'rgba(74,222,128,0.12)'  : isMid ? 'rgba(240,192,64,0.12)'  : 'rgba(248,113,113,0.12)';
  const bdr = isHigh ? 'rgba(74,222,128,0.30)'  : isMid ? 'rgba(240,192,64,0.30)'  : 'rgba(248,113,113,0.30)';
  const col = isHigh ? '#4ade80'                : isMid ? '#f0c040'                : '#f87171';
  const label = `${pct}% correct`;
  ctx.font = '700 18px Nunito, sans-serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(label).width;
  const bw = tw + 28, bh = 30;
  ctx.beginPath();
  roundRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 15);
  ctx.fillStyle = bg;    ctx.fill();
  ctx.strokeStyle = bdr; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = col;
  ctx.fillText(label, cx, cy + 6);
}

// Vertical category list — used in Story card (returns ending y)
function drawCategoryList(ctx, lx, startY, aw, categories, rowH = 44) {
  let y = startY;
  const fontSize  = rowH >= 40 ? 26 : 22;
  const textToBar = rowH >= 40 ? 18 : 12;
  const barH      = rowH >= 40 ? 10 :  8;
  const barToNext = rowH - textToBar - barH;

  categories.forEach(cat => {
    const style = getCatStyle(cat.name);
    const ratio = cat.total > 0 ? cat.correct / cat.total : 0;

    ctx.font = `700 ${fontSize}px Nunito, sans-serif`;
    ctx.fillStyle = style.text;
    ctx.textAlign = 'left';
    ctx.fillText(cat.name, lx, y);

    ctx.textAlign = 'right';
    ctx.fillText(`${cat.correct}/${cat.total}`, lx + aw, y);
    y += textToBar;

    // Bar track
    ctx.beginPath();
    roundRect(ctx, lx, y, aw, barH, Math.floor(barH / 2));
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();

    // Bar fill
    if (ratio > 0) {
      ctx.beginPath();
      roundRect(ctx, lx, y, aw * ratio, barH, Math.floor(barH / 2));
      ctx.fillStyle = style.text;
      ctx.globalAlpha = 0.65;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    y += barH + barToNext;
  });
  return y;
}

// ── Card formats ───────────────────────────────────────

function drawStoryCard(ctx, w, h, data) {
  drawBg(ctx, w, h, [[0,'#090915'],[0.5,'#110c32'],[1,'#0a1524']]);
  drawDotGrid(ctx, w, h);
  drawTopAccent(ctx, w);

  ctx.textAlign = 'center';

  // Header
  let y = 100;
  ctx.font = '900 38px Nunito, sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.fillText('♛', w / 2, y); y += 48;

  ctx.font = '800 24px Nunito, sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.fillText('FACT ROYALE', w / 2, y); y += 30;

  ctx.font = '400 17px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(240,192,64,0.52)';
  ctx.fillText(data.date, w / 2, y);

  // Score hero
  const scoreCY = 338;
  drawScoreRing(ctx, w / 2, scoreCY, 80);

  ctx.font = '900 80px Nunito, sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.textAlign = 'center';
  ctx.fillText(String(data.score), w / 2, scoreCY + 30);

  ctx.font = '400 19px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(232,232,240,0.48)';
  ctx.fillText('out of ' + data.total, w / 2, scoreCY + 55);

  drawPctBadge(ctx, w / 2, scoreCY + 90, data.score, data.total);

  // Stats
  let sy = scoreCY + 128;
  if (data.rank) {
    ctx.font = '600 18px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(232,232,240,0.72)';
    ctx.textAlign = 'center';
    ctx.fillText(data.rank, w / 2, sy); sy += 28;
  }
  if (data.streak > 1) {
    ctx.font = '400 18px Nunito, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('🔥 ' + data.streak + '-day streak', w / 2, sy); sy += 28;
  }

  // Category section (vertical bars)
  const catItemH = data.categories.length >= 5 ? 44 : 52;
  const catY = Math.max(sy + 24, 565);
  drawHLine(ctx, w, catY - 14);

  ctx.font = '600 14px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(240,192,64,0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('BREAKDOWN', w / 2, catY + 10);
  const margin = 62;
  const listEnd = drawCategoryList(ctx, margin, catY + 30, w - margin * 2, data.categories, catItemH);

  drawHLine(ctx, w, listEnd + 16);

  ctx.font = '700 16px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(240,192,64,0.55)';
  ctx.textAlign = 'center';
  ctx.fillText('♛  fact-royale.com', w / 2, listEnd + 48);
}

function drawWideCard(ctx, w, h, data) {
  drawBg(ctx, w, h, [[0,'#090915'],[0.5,'#110c32'],[1,'#0a1524']]);
  drawDotGrid(ctx, w, h);
  drawTopAccent(ctx, w);

  const divX = Math.round(w * 0.46);  // divider slightly left of center
  const lc   = divX / 2;              // left column center
  const rx   = divX + 44;             // right column start
  const rEnd = w - 38;                // right column end
  const rw   = rEnd - rx;

  // LEFT: Brand + Score
  ctx.textAlign = 'center';

  ctx.font = '900 22px Nunito, sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.fillText('♛', lc, 46);

  ctx.font = '800 17px Nunito, sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.fillText('FACT ROYALE', lc, 70);

  ctx.font = '400 13px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(240,192,64,0.52)';
  ctx.fillText(data.date, lc, 88);

  // Score ring
  const scoreCY = 248;
  drawScoreRing(ctx, lc, scoreCY, 68);

  ctx.font = '900 72px Nunito, sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.textAlign = 'center';
  ctx.fillText(String(data.score), lc, scoreCY + 26);

  ctx.font = '400 15px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(232,232,240,0.48)';
  ctx.fillText('out of ' + data.total, lc, scoreCY + 47);

  drawPctBadge(ctx, lc, scoreCY + 74, data.score, data.total);

  // URL bottom-left
  ctx.font = '700 15px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(240,192,64,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('♛  fact-royale.com', lc, h - 22);

  // Vertical divider
  ctx.save();
  ctx.strokeStyle = 'rgba(240,192,64,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, 30);
  ctx.lineTo(divX, h - 30);
  ctx.stroke();
  ctx.restore();

  // RIGHT: Stats + Category bars
  let ry = 42;

  if (data.rank) {
    ctx.font = '600 15px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(232,232,240,0.75)';
    ctx.textAlign = 'left';
    ctx.fillText(data.rank, rx, ry); ry += 24;
  }

  if (data.streak > 1) {
    ctx.font = '400 15px Nunito, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'left';
    ctx.fillText('🔥 ' + data.streak + '-day streak', rx, ry); ry += 24;
  }

  // Divider
  ry += 5;
  ctx.save();
  ctx.strokeStyle = 'rgba(240,192,64,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rx, ry);
  ctx.lineTo(rEnd, ry);
  ctx.stroke();
  ctx.restore();
  ry += 16;

  // BREAKDOWN label
  ctx.font = '600 12px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(240,192,64,0.4)';
  ctx.textAlign = 'left';
  ctx.fillText('BREAKDOWN', rx, ry); ry += 18;

  // Category bars
  const barH = 7, barR = 3;
  data.categories.forEach(cat => {
    const style = getCatStyle(cat.name);
    const ratio = cat.total > 0 ? cat.correct / cat.total : 0;

    ctx.font = '400 15px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(232,232,240,0.65)';
    ctx.textAlign = 'left';
    ctx.fillText(cat.name, rx, ry);

    ctx.font = '700 15px Nunito, sans-serif';
    ctx.fillStyle = style.text;
    ctx.textAlign = 'right';
    ctx.fillText(`${cat.correct}/${cat.total}`, rEnd, ry);
    ry += 12;

    // Bar track
    ctx.beginPath();
    roundRect(ctx, rx, ry, rw, barH, barR);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();

    // Bar fill
    if (ratio > 0) {
      ctx.beginPath();
      roundRect(ctx, rx, ry, rw * ratio, barH, barR);
      ctx.fillStyle = style.text;
      ctx.globalAlpha = 0.65;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ry += barH + 14;
  });
}

function drawSquareCard(ctx, w, h, data) {
  drawBg(ctx, w, h, [[0,'#090915'],[0.5,'#110c32'],[1,'#0a1524']]);
  drawDotGrid(ctx, w, h);
  drawTopAccent(ctx, w);

  // ── Left column: brand + score ─────────────────────────
  const divX = Math.round(w * 0.44);
  const lc   = divX / 2;
  const rx   = divX + 36;
  const rEnd = w - 32;
  const rw   = rEnd - rx;

  ctx.textAlign = 'center';

  ctx.font = '900 26px Nunito, sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.fillText('♛', lc, 52);

  ctx.font = '800 17px Nunito, sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.fillText('FACT ROYALE', lc, 76);

  ctx.font = '400 12px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(240,192,64,0.52)';
  ctx.fillText(data.date, lc, 94);

  // Score ring
  const scoreCY = 258;
  drawScoreRing(ctx, lc, scoreCY, 66);

  ctx.font = '900 70px Nunito, sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.textAlign = 'center';
  ctx.fillText(String(data.score), lc, scoreCY + 25);

  ctx.font = '400 14px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(232,232,240,0.48)';
  ctx.fillText('out of ' + data.total, lc, scoreCY + 46);

  drawPctBadge(ctx, lc, scoreCY + 72, data.score, data.total);

  // URL bottom-left
  ctx.font = '700 12px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(240,192,64,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('♛  fact-royale.com', lc, h - 22);

  // ── Vertical divider ────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(240,192,64,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, 28);
  ctx.lineTo(divX, h - 28);
  ctx.stroke();
  ctx.restore();

  // ── Right column: rank + streak + breakdown bars ──────
  let ry = 44;

  if (data.rank) {
    ctx.font = '600 13px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(232,232,240,0.75)';
    ctx.textAlign = 'left';
    ctx.fillText(data.rank, rx, ry); ry += 22;
  }

  if (data.streak > 1) {
    ctx.font = '400 13px Nunito, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'left';
    ctx.fillText('🔥 ' + data.streak + '-day streak', rx, ry); ry += 22;
  }

  ry += 6;
  ctx.save();
  ctx.strokeStyle = 'rgba(240,192,64,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rEnd, ry); ctx.stroke();
  ctx.restore();
  ry += 18;

  ctx.font = '600 11px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(240,192,64,0.4)';
  ctx.textAlign = 'left';
  ctx.fillText('BREAKDOWN', rx, ry); ry += 20;

  // Spread bars evenly across the remaining right-column height
  const catCount = data.categories.length || 5;
  const availH   = (h - 36) - ry;
  const rowH     = Math.floor(availH / catCount);
  const sqBarH   = Math.min(10, Math.floor(rowH * 0.18));
  const textToBar = Math.floor(rowH * 0.28);
  const barToNext = rowH - textToBar - sqBarH;

  data.categories.forEach(cat => {
    const style = getCatStyle(cat.name);
    const ratio = cat.total > 0 ? cat.correct / cat.total : 0;

    ctx.font = '400 13px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(232,232,240,0.65)';
    ctx.textAlign = 'left';
    ctx.fillText(cat.name, rx, ry);

    ctx.font = '700 13px Nunito, sans-serif';
    ctx.fillStyle = style.text;
    ctx.textAlign = 'right';
    ctx.fillText(`${cat.correct}/${cat.total}`, rEnd, ry);
    ry += textToBar;

    ctx.beginPath();
    roundRect(ctx, rx, ry, rw, sqBarH, Math.floor(sqBarH / 2));
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();

    if (ratio > 0) {
      ctx.beginPath();
      roundRect(ctx, rx, ry, rw * ratio, sqBarH, Math.floor(sqBarH / 2));
      ctx.fillStyle = style.text;
      ctx.globalAlpha = 0.65;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ry += sqBarH + barToNext;
  });
}

// ── Share actions ──────────────────────────────────────

async function shareCardImage() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  canvas.toBlob(async (blob) => {
    const file = new File([blob], 'fact-royale-score.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Fact Royale',
          text: `I scored ${score}/${questions.length} on today's Fact Royale. fact-royale.com`
        });
      } catch (e) {
        if (e.name !== 'AbortError') downloadCardImage();
      }
    } else {
      downloadCardImage();
    }
  }, 'image/png');
}

function downloadCardImage() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = `fact-royale-${activeQuizDate}.png`;
  a.href     = canvas.toDataURL('image/png');
  a.click();
}

function shareScore() {
  openShareModal();
}

// ── Share modal wiring ─────────────────────────────────

function initShareModal() {
  const modal = document.getElementById('share-modal');
  if (!modal) return;

  // Smart button labels: mobile gets native share sheet, desktop gets download
  const hasNativeShare = !!(navigator.share && navigator.canShare);
  const shareBtn = document.getElementById('btn-share-image');
  const dlBtn    = document.getElementById('btn-download-image');
  if (shareBtn) shareBtn.textContent = hasNativeShare ? 'Share Image' : 'Download Image';
  if (dlBtn) dlBtn.style.display = hasNativeShare ? '' : 'none';

  document.getElementById('share-modal-close')
    .addEventListener('click', closeShareModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeShareModal();
  });

  modal.querySelectorAll('.share-fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      shareFormat = btn.dataset.format;
      modal.querySelectorAll('.share-fmt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderShareCard();
    });
  });

  document.getElementById('btn-share-image')
    .addEventListener('click', shareCardImage);

  document.getElementById('btn-download-image')
    .addEventListener('click', downloadCardImage);

  const copyLinkBtn = document.getElementById('btn-copy-link');
  copyLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText('https://fact-royale.com').then(() => {
      copyLinkBtn.textContent = 'Copied! ✓';
      setTimeout(() => { copyLinkBtn.textContent = 'Copy Link'; }, 2200);
    });
  });
}

// ── Boot ───────────────────────────────────────────────

async function init() {
  todayKey = getTodayKey();
  initShareModal();

  // Check for archive date param (?date=YYYY-MM-DD)
  const urlParams = new URLSearchParams(window.location.search);
  const dateParam = urlParams.get('date');

  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam !== todayKey) {
    const quizDate  = new Date(dateParam + 'T00:00:00');
    const todayDate = new Date(todayKey  + 'T00:00:00');
    const daysDiff  = Math.floor((todayDate - quizDate) / (1000 * 60 * 60 * 24));

    if (daysDiff > 0 && daysDiff <= ARCHIVE_FREE_DAYS) {
      isArchivePlay  = true;
      activeQuizDate = dateParam;
      // ?autostart=1 — skip the archive landing and go straight to the quiz
      // (auth.js onAuthStateChanged triggers startArchiveQuiz() once user resolves)
      if (urlParams.get('autostart') === '1') {
        window.fr_autoStart = true;
      }
    } else if (daysDiff > ARCHIVE_FREE_DAYS) {
      showArchiveLockedScreen(dateParam);
      return;
    }
    // daysDiff <= 0 = future date — fall through to today's quiz
  }

  if (!activeQuizDate) activeQuizDate = todayKey;

  try {
    const res  = await fetch(`questions/${activeQuizDate}.json`);
    if (!res.ok) throw new Error('No quiz file');
    const data = await res.json();

    questions = shuffle(data.questions);

    if (isArchivePlay) {
      setupArchiveLanding(data);
    } else {
      setupLanding(data);
    }
    showScreen('screen-landing');
  } catch (e) {
    showScreen('screen-noquiz');
  }
}

document.addEventListener('DOMContentLoaded', init);
