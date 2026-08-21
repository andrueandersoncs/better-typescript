# Laws of Software

Compiled on 2026-08-20 from the 30 entries in the [Laws of Software source collection](https://github.com/shaisachs/laws-of-software/tree/74dbec921e7e1f1aa42b2a94880406e5a6b14736/_laws), in the order shown on [the site](https://www.laws-of-software.com/). The source content is by Shai Sachs and licensed under [GPL v3](https://github.com/shaisachs/laws-of-software/blob/74dbec921e7e1f1aa42b2a94880406e5a6b14736/LICENSE.txt).

## [Atwood's Law](https://www.laws-of-software.com/laws/atwood/)

> Any application that can be written in JavaScript, will eventually be written in JavaScript.

— [Jeff Atwood, 2009](https://blog.codinghorror.com/all-programming-is-web-programming/)

Ultimately this law concerns software distribution: the web is the best mechanism for distributing software, JavaScript is the language of the web, hence Atwood's law. It might be updated some day to include WASM, though that's yet to be seen. Certainly the years since this blog post was published seem to have vindicated the law, though the growth of embedded systems in everything from cars to toasters runs counter to Atwood's original point.

## [The Bitter Lesson](https://www.laws-of-software.com/laws/bitter-lesson/)

> General methods that leverage computation are ultimately the most effective, and by a large margin.

— [Richard Sutton, 2019](http://www.incompleteideas.net/IncIdeas/BitterLesson.html)

This essay argues that, across 70 years of AI research, the methods that ultimately succeeded were those that scaled computation - via search and learning - rather than those that encoded human knowledge about a domain. Time after time, from computer chess to speech recognition to computer vision, researchers initially tried to build their own understanding into their systems, only to be outperformed once massive computation was applied through general-purpose methods. The bitter lesson is that, when addressing a problem, writing a solution that relies on domain-specific knowledge does not work in the long run. Instead, we should build in the meta-methods that can find and capture complexity on their own. Compare this law to Moore's Law, which underpins the ever-increasing availability of computation that makes this approach viable.

## [Brooks's Law](https://www.laws-of-software.com/laws/brooks/)

> Adding [human resources] to a late software project makes it later.

— [Fred Brooks, 1975](https://www.amazon.com/Mythical-Man-Month-Software-Engineering-Anniversary/dp/0201835959?&_encoding=UTF8&tag=lawsofsoftwar-20&linkCode=ur2&linkId=175e9c6c1c8766c1ff56f05c2f7469e8&camp=1789&creative=9325)

This law first appeared in a classic book, [The Mythical Man-Month](https://www.amazon.com/Mythical-Man-Month-Software-Engineering-Anniversary/dp/0201835959?&_encoding=UTF8&tag=lawsofsoftwar-20&linkCode=ur2&linkId=175e9c6c1c8766c1ff56f05c2f7469e8&camp=1789&creative=9325). The central insight is that new developers require onboarding, which in turn requires time of existing developers, which in turn subtracts time from ongoing projects. Hence, a word of caution for hapless managers who attempt to speed up a project which is running off the rails: adding new resources will only exacerbate the problem.

The qualifier "late" in the statement of the law is an important one. It suggests that human resources *can* be added to projects which are not late. Hence, for example, the success of some open source software projects, which successfully incorporate thousands of developers over the course of their lifetimes.

## [Conway's Law](https://www.laws-of-software.com/laws/conway/)

> Any organization that designs a system (defined broadly) will produce a design whose structure is a copy of the organization's communication structure.

— [Melvin Conway, 1968](https://www.melconway.com/Home/Conways_Law.html)

Conway's Law is considered a driving principle of software management. Once an engineering organization is split up a certain way, its products will tend to reflect the org chart over time; it follows that org chart changes must be considered carefully. The [inverse Conway maneuver](https://www.thoughtworks.com/radar/techniques/inverse-conway-maneuver) attempts to flip the logic of this law on its head, by designing org charts that promote a desired software architecture. Arguably, the microservices revolution is an example of such a maneuver.

## [Cunningham's Law](https://www.laws-of-software.com/laws/cunningham/)

> The best way to get the right answer on the internet is not to ask a question; it's to post the wrong answer.

— [Ward Cunningham, 1980](https://archive.nytimes.com/schott.blogs.nytimes.com/2010/05/28/weekend-competition-schotts-law/)

Cunningham's formulation was apocryphally described in a comment on Ben Schott's blog in 2010. As stated, it describes the way people interact on the internet; it was [satirized by XKCD](https://xkcd.com/386/). More broadly, it's a supposition about human nature, i.e. that people would rather argue againt an assertion than fill in a blank.

The date of the law is highly uncertain, since it's been described second-hand and was a casual aphorism rather than a formal publication. Given that it's claimed to have bene coined in the early 1980s, it's likely it was phrased in terms of Usenet forums or similar contexts rather than more modern formats like blogs.

## [Doerr's Law](https://www.laws-of-software.com/laws/doerr/)

> We need teams of missionaries, not teams of mercenaries.

— [John Doerr, 2015](https://www.svpg.com/missionaries-vs-mercenaries/)

The point of this law is that product teams should be mission-oriented: engaged, autonomous, and otherwise be tied in to the organization's larger mission. Mercenaries are motivated primarily by money, and are uninterested in the mission insofar as it doesn't impact their ability to get paid.

In the sense that this law pushes managers to empower teams, and to find ways to give them intrinsic motivation based in an organization's mission - it is on balance a good law. However, it is easy to take this train of thought too far, namely to assume that total loyalty can be assumed of employees without necessarily earning that loyalty. Colloquially, the extreme version of this thought is expecting employees to "drink the Kool-Aid" of an organization's ideology. Clearly, it's necessary for leaders to chart a moderate path.

## [Fitt's Law](https://www.laws-of-software.com/laws/fitt/)

> The time to acquire a target is a function of the distance to and the size of the target.

— [Paul Fitts, 1954](https://doi.apa.org/doiLanding?doi=10.1037%2Fh0055392)

Originating in psychology and usability studies, this law studied the ease of grasping a physical target. The law is of direct importance to user interface designers today, and to the software developers who create those interfaces. It is also applicable to software interfaces: for example, it manifests in the ease-of-use of APIs.

## [Gall's Law](https://www.laws-of-software.com/laws/gall/)

> A complex system that works has evolved from a simple system that worked. A complex system built from scratch won’t work.

— [John Gall, 1975](https://www.amazon.com/SYSTEMANTICS-SYSTEMS-BIBLE-John-Gall-ebook/dp/B00AK1BIDM?&_encoding=UTF8&tag=lawsofsoftwar-20&linkCode=ur2&linkId=55d61fcdfabf182924a164860124a790&camp=1789&creative=9325)

Originating in systems design, this law encourages software developers and product managers alike to begin with simple systems and grow towards complexity - rather than beginning with a complex system. This law is often cited as the reason for the failure of complex systems like CORBA, and is hailed as the reason for success of systems which began humbly, such as the World Wide Web.

## [Goodhart's Law](https://www.laws-of-software.com/laws/goodhart/)

> When a measure becomes a target, it ceases to be a good measure.

— [Charles Goodhart, 1975](https://link.springer.com/chapter/10.1007/978-1-349-17295-5_4)

Originating in economics, this law posits a pessimistic view of measuring the success of software. Once a given measure, for example lines of code, becomes reified as the measure of success, then software developers can readily maximize that measure, for example by adding a lot of superfluous comments or other unnecessary code. This law joins others which indicate the difficulty of measuring software projects, such as Hofstadter's.

## [Greenspun's tenth rule](https://www.laws-of-software.com/laws/greenspun/)

> Any sufficiently complicated C or Fortran program contains an ad hoc, informally-specified, bug-ridden, slow implementation of half of Common Lisp.

— [Philip Greenspun](https://philip.greenspun.com/research/)

This "tenth" rule is not really preceded by nine other rules, and its original date of publication is unknown. It's a prescient warning about choosing the right rule for the job; a low-level language might not really be suitable for a sufficiently complicated task, and such a choice can in fact be self-defeating if it causes the programmer to reinvent higher-order abstractions imperfectly.

## [Hofstadter's Law](https://www.laws-of-software.com/laws/hofstadter/)

> It always takes longer than you expect, even when you take into account Hofstadter's Law.

— [Douglas Hofstadter, 1979](https://www.amazon.com/G%C3%B6del-Escher-Bach-Eternal-Golden/dp/0465026567?&_encoding=UTF8&tag=lawsofsoftwar-20&linkCode=ur2&linkId=e1e23b12680c726714d88bff8af5af60&camp=1789&creative=9325)

First coined in Hofstadter's book [Gödel, Escher, Bach](https://www.amazon.com/G%C3%B6del-Escher-Bach-Eternal-Golden/dp/0465026567?&_encoding=UTF8&tag=lawsofsoftwar-20&linkCode=ur2&linkId=e1e23b12680c726714d88bff8af5af60&camp=1789&creative=9325), this law nods at the difficulty of accurately estimating the length of software projects. It's self-referential in a way that Gödel especially would have appreciated. Indeed, advice to rising software managers commonly suggests adding a "buffer" to their estimates. This law suggests that the buffer will never be enough. Zawinski's Law may provide an explanation for this phenomenon: even when developers complete their tasks within the estimated time, software bloat will cause the project to expand and then overflow the buffer.

## [Hyrum's Law](https://www.laws-of-software.com/laws/hyrum/)

> With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody.

— [Hyrum Wright, 2012](https://www.hyrumslaw.com/)

Given enough use, there is no such thing as a private implementation. That is, if an interface has enough consumers, they will collectively depend on every aspect of the implementation, intentionally or not. This effect serves to constrain changes to the implementation, which must now conform to both the explicitly documented interface, as well as the implicit interface captured by usage. We often refer to this phenomenon as "bug-for-bug compatibility."

## [Jevons Paradox](https://www.laws-of-software.com/laws/jevons/)

> As technological progress increases the efficiency with which a resource is used, the rate of consumption of that resource tends to rise rather than fall.

— [William Stanley Jevons, 1865](https://www.econlib.org/library/YPDBooks/Jevons/jvnCQ.html)

Jevons first described this effect while studying Britain's coal consumption: more efficient steam engines led to more coal being burned, not less, because the cheaper engines made coal-powered industry economical in far more places. The paradox has become extremely popular in software circles lately, as the falling cost of writing software is making applications economical that would previously have been dismissed as not worth building. As AI-assisted development and other tools continue to reduce the cost of software production, demand for software seems likely to expand correspondingly. Software that was once too expensive to build becomes worth building, so cheaper software is unlikely to mean less software.

## [Kerchkhoff's principle](https://www.laws-of-software.com/laws/kerchkhoff/)

> In cryptography, a system should be secure even if everything about the system, except for a small piece of information - the key - is public knowledge.

— [Auguste Kerckhoffs, 1883](https://www.arcsi.fr/doc/cryptomilitaire.pdf)

This principle predates modern software development by several decades, but establishes an important principle that extends beyond the domain of cryptography. It establishes a bright line between the code in a system, which is public knowledge, and the data in the system, which is private. By doing so, it discourages the common but ultimately insecure practice of "security by obscurity". This principle has found particular popularity in the open source community, which is built on the principle of publicizing source code but not the data it uses.

## [Kernighan's Law](https://www.laws-of-software.com/laws/kernighan/)

> Everyone knows that debugging is twice as hard as writing a program in the first place. So if you’re as clever as you can be when you write it, how will you ever debug it?

— [Brian Kernighan, 1974](https://www.amazon.com/Elements-Programming-Style-2nd/dp/0070342075/?&_encoding=UTF8&tag=lawsofsoftwar-20&linkCode=ur2&linkId=39fc55b6042cc45ae5a739e6861b1a86&camp=1789&creative=9325)

It's commonplace to conclude that debugging is harder than writing a program; empirical studies have actually shown that "twice as hard" might be an underestimate. Kernighan looks at this phenomenon from the opposite angle, arguing that it's better to write simple code with an eye towards long-term maintainability. Compare to Knuth's optimization principle.

## [Knuth's optimization principle](https://www.laws-of-software.com/laws/knuth/)

> Premature optimization is the root of all evil.

— [Donald Knuth, 1974](https://dl.acm.org/doi/10.1145/356635.356640)

Commonly attributed to Donald Knuth, some say this principle is really a popularization of a quote by Tony Hoare. As with all principles, this one may be taken to improper extremes: neglecting optimization altogether, or choosing intentionally mal-performing approaches from the outset. At one extreme, developers can spend a lot of time writing tightly optimized loops which gain small improvements in efficiency at the expense of huge reductions in maintainability. At the other extreme, developers can choose the wrong framework, or a grossly inappropriate database for the task at hand, leading to "maintainable" software which wilts under the slightest load. In the original article, Knuth himself considers some of these trade-offs; in the main he argues against a "penny-wise, pound-foolish" attitude. Compare to Wirth's Law.

## [Law of Leaky Abstractions](https://www.laws-of-software.com/laws/leaky-astractions/)

> All non-trivial abstractions, to some degree, are leaky.

— [Joel Spolsky, 2002](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/)

This law points out that abstractions are imperfect. Hence, for example, SQL programmers must know a fair amount about their database server's query plans in order to understand their code's performance characteristics - the abstractions of the query language are not much help.

Taken to its logical conclusion, this law suggests that abstractions "save us time working, but they don’t save us time learning." The result is a grim conclusion, that programming is only getting more difficult as time goes on.

## [Lindy's Law](https://www.laws-of-software.com/laws/lindy/)

> The future life expectancy of some non-perishable things, like a technology or an idea, is proportional to their current age.

— [Albert Goldman, 1964](https://gwern.net/doc/statistics/probability/1964-goldman.pdf)

Named after Lindy's delicatessen in New York City, where comedians gathered to discuss their craft, this effect holds that the longer a non-perishable thing has survived, the longer it is likely to continue surviving. In software, it is a useful argument for choosing older, battle-tested technologies over newer, less proven ones: a technology that has endured for decades is more likely to still be around in the coming years than one that just appeared on the scene.

## [Linus's Law](https://www.laws-of-software.com/laws/linus/)

> Given enough eyeballs, all bugs are shallow.

— [Linus Torvalds, 1999](https://www.amazon.com/Cathedral-Bazaar-Musings-Accidental-Revolutionary/dp/0596001088?&_encoding=UTF8&tag=lawsofsoftwar-20&linkCode=ur2&linkId=f6fd5393e16732fd608e42e74fa05f4d&camp=1789&creative=9325)

This law is attributed to Linus Torvalds but was popularized by Eric Raymond in his famous essay, The Cathedral and the Bazaar. It's something of an introduction to the open source movement. Torvalds's central argument is that increasing the number of developers on a project reduces the time to resolve bugs. For any single bug, some of those developers will inevitably have the central insight or knowledge to address the bug. Contrast this Law with Brooks's, and also compare to Kerchkhoff's.

## [Little's Law](https://www.laws-of-software.com/laws/little/)

> The average number of items in a system is the product of the average rate at which items arrive and the average time each item spends in the system.

— [John D. C. Little, 1961](https://pubsonline.informs.org/doi/10.1287/opre.9.3.383)

Little's Law is often written as L = λW, and it has since become a cornerstone of queueing theory and operations management.

In software development, Little's Law is frequently used to reason about workflow: the average amount of work in progress is the product of the throughput (arrival rate) and the average cycle time. If you know any two of these quantities, you can derive the third, which makes the law a useful tool for forecasting and for understanding the trade-offs of limiting work in progress. While the original law relied on restrictive assumptions about stationary stochastic processes, [others have since argued](https://www.polaris-flow-dispatch.com/p/littles-law-in-a-complex-adaptive) that Little's Law holds even in complex adaptive systems - messy, non-stationary environments like teams working toward product-market fit - so long as the relevant long-run averages are measured correctly.

## [Lady Lovelace's Objection](https://www.laws-of-software.com/laws/lovelace/)

> The Analytical Engine has no pretensions to originate anything. It can do whatever we know how to order it to perform.

— [Ada Lovelace, 1842](http://history-computer.com/Library/Sketch%20of%20Engine.pdf)

This law received its title from Alan Turing, in his famous 1950 paper [Computing Machinery and Intelligence](https://academic.oup.com/mind/article/LIX/236/433/986238). Few people consider Lady Lovelace's Objection a proper law of software development, although it is one of the most fundamental statements of the capabilities of software by the person who invented the practice. There is a great deal of debate about this idea today, as artificial intelligence appears to do more and more astounding things every year. However, given the lack of precise definitions for many of the terms of debate, no suitable conclusion is available.

## [Moore's Law](https://www.laws-of-software.com/laws/moore/)

> The complexity for minimum component costs has increased at a rate of roughly a factor of two per year. Certainly over the short term this rate can be expected to continue, if not to increase. Over the longer term, the rate of increase is a bit more uncertain, although there is no reason to believe it will not remain nearly constant for at least 10 years.

— [Gordon Moore, 1965](https://newsroom.intel.com/wp-content/uploads/sites/11/2018/05/moores-law-electronics.pdf)

It's fairly commonplace to observe that the average smartphone today is more powerful than even the most expensive computers 50 years ago. Moore's Law is responsible for this curious state of affairs: computers become exponentially more powerful over the years, and the cost of computing falls over time commensurately. Similar trajectories exist in the cost of data storage, so that the storage available on cheap devices today exceeds by orders of magnitude the storage available on high-end work stations twenty years ago. An unfortunate corollary, known as Moore's second law or Rock's Law, is that the cost of research and development to achieve this exponential growth moves in the opposite direction. Possibly as a consequence, many have speculated that [Moore's Law no longer applies](https://www.technologyreview.com/2020/02/24/905789/were-not-prepared-for-the-end-of-moores-law/), with potentially wide-ranging consequences for software but also for the economy at large.

## [Norvig's Law](https://www.laws-of-software.com/laws/norvig/)

> Any technology that surpasses 50% penetration will never double again.

— [Peter Norvig, 1999](https://norvig.com/norvigs-law.html)

A somewhat tongue-in-cheek truism about technological adoption and numeracy in popular press. In point of fact, Norvig's Law can be thought of as a maxim to apply careful thought to any discussion of numbers, and to define terms precisely. As Norvig himself points out, it is in fact possible to sell twice as more units by changing the metrics by which market penetration are measured - e.g. selling to individuals instead of households.

## [Parkinson's Law](https://www.laws-of-software.com/laws/parkinson/)

> Work expands so as to fill the time available for its completion.

— [Cyril Parkinson, 1955](https://www.economist.com/news/1955/11/19/parkinsons-law)

Originating in management studies, this law first observed the growth of bureaucracies over time. It has since been applied to software complexity, and there are corollaries which suggest that increasing software complexity in fact enables bureaucratic growth. Compare to Zawinski's Law.

## [Peter Principle](https://www.laws-of-software.com/laws/peter-principle/)

> People in a hierarchy tend to rise to "a level of respective incompetence."

— [Laurence J. Peter, 1969](https://www.amazon.com/Peter-Principle-Things-Always-Wrong-ebook/dp/B00IRCZHXI/?&_encoding=UTF8&tag=lawsofsoftwar-20&linkCode=ur2&linkId=5fdaa1952a35093fddd09bc1d693482a&camp=1789&creative=9325)

The Peter Principle, founded on research conducted by Laurence J. Peter, states that individuals rise through a hierarchy until they are not competent enough to rise further. It's often understood as a cynical condemnation of organizational culture. Implicitly, it suggests that leaders are not competent for the challenges they face.

Naturally, some organizations make efforts to counteract the Peter Principle, for example by providing managers with training and continuing education.

## [Postel's Law](https://www.laws-of-software.com/laws/postel/)

> Be conservative in what you send, liberal in what you accept.

— [Jon Postel, 1980](https://tools.ietf.org/html/rfc760)

Established during the creation of the Internet Protocol, this principle encourages the development of robust software; it's often referred to as the Robustness Principle. There is a trade-off to robustness, of course: it can increase maintenance costs and compromise security if not implemented properly. This law conflicts to some degree with certain kinds of software interfaces, e.g. event-carried state transfer.

## [Generative AI Scaling Laws](https://www.laws-of-software.com/laws/scaling-laws/)

> The performance of language models scales predictably with three quantities: the number of parameters, the amount of training data, and the amount of compute.

— [Jared Kaplan, 2020](https://arxiv.org/abs/2001.08361)

The empirical regularity that this law captures made scale a reliable engineering lever for generative AI. Rather than hand-tuning architectures or hunting for cleverer algorithms, model builders could simply spend more compute and more data, with a reasonable expectation of steady gains. That expectation has largely been validated by the steady march of ever-larger models, though not without complications: a later analysis from DeepMind suggested that the original account over-weighted parameters relative to data, and argued that training data should be scaled up in tandem with model size, roughly doubling the number of training tokens for every doubling of parameters.

The catch is that the data needed to sustain this approach is a finite resource. The internet contains only so much text written by humans, and modern models have already consumed a large fraction of it. There is no "second internet" from which to draw more; the stock of high-quality public text is growing far more slowly than the appetite of successive models. One [analysis](https://arxiv.org/abs/2211.04325) projects that, on current trends, models will be trained on datasets comparable in size to the entire stock of public human-generated text before the end of this decade, at which point further progress will depend on synthetic data, better data efficiency, or other innovations.

## [Shirky principle](https://www.laws-of-software.com/laws/shirky/)

> Institutions will try to preserve the problem to which they are the solution.

— [Clay Shirky, 2010](https://www.amazon.com/exec/obidos/ASIN/1594202532?&linkCode=ll1&tag=lawsofsoftwar-20&linkId=6c52158e683e33f8fcb0b106de7dbafc&language=en_US&ref_=as_li_ss_tl)

This law is really about business generally rather than software in particular. However, it has broad application to software since so much of software product design focuses on solving user problems. The law is a cautionary tale about the perverse incentives that can inadvertantly cause organizations to prolong rather than solve problems. While the law was originally stated by Clay Shirky, it was coined the Shirky principle by [Kevin Kelly](https://kk.org/thetechnium/the-shirky-prin/).

## [Wirth's Law](https://www.laws-of-software.com/laws/wirth/)

> Software gets slower faster than hardware gets faster.

— [Niklaus Wirth, 1995](https://www.computer.org/csdl/magazine/co/1995/02/r2064/13rRUwInv7E)

Commonly considered a rejoinder to Moore's Law, this law comments on the tendency for software to expand in scope over time. What's astounding is that Wirth suggests that software scope expands even more quickly than the exponential growth suggested by Moore. Compare to Zawinski's Law.

## [Zawinski's Law](https://www.laws-of-software.com/laws/zawinski/)

> Every program attempts to expand until it can read mail. Those programs which cannot so expand are replaced by ones which can.

— [James Zawinski, 1995](https://www.jwz.org/hacks/)

This law is both comical and grim at once. Many programs are totally unrelated to email: consider text editors, compilers, games, etc. Zawinski's Law, also known as the the Law of Software Bloat, suggests that feature creep will inevitably cause all of these programs to read email even though it's entirely unrelated to their core mission. Though there are certainly counter-examples to this specific manifestation of the law, feature creep is an ongoing problem in software development.
