# Zarathustra

Zarathustra is the world's first distributed and sharded AI, designed to be a completely open inference platform. Rather than persue a monolithic design, a market of highly specialized models which compute model outputs off-chain coordinate to answer user queries to earn economic rewards on-chain. The network leverages sharding techniques to distribute and coordinate functionalities across different AI models. Each shard, or model, is tasked with a specific domain such as algebra, language translation, Javascript programming etc. This unique approach allows for a modularly scalable network capapble of handling a diverse set of tasks with greater efficiency. 

# Vision

The internet has allowed seamless communication of information across individuals globally. Cryptocurrency has enabled the coordination of individuals across the internet, as economic incentives, along with digital property rights and governance models, have fostered a new way for communities to organise and develop open source software together.

In the future, the challenge at hand will not be to coordinate people, but complex networks of intelligent agents. As AI obtains increasing autonomy, a greater demand for communication and interaction between intelligent agents will emerge. These agents will need to be equipped with standardized protocols and interfaces to facilitate trustless data exchange and negotiation. In order to facilitate this coordination effectively, clear economic incentive structures, with rewards and penalties, will need to be defined to ensure strong coordination amongst agents. This is the core vision of Zarathustra.

# How It Works

Zarathustra compromises of three primary actors: users, routers, and models. These are coordinated via a smart contract.

Users interface with the frontend to submit queries, such as "How many r's are there in strawberry?". They submit their queries to a smart contract, which processes and broadcasts an event emission. Such an event emission is picked up by a router. The router is an advanced Large Language Model (LLM) responsible for analyzing the query to determine its nature and required tasks. Based on the analysis, the router dispatches the task to the appropriate specialized model.

However, there are cases where a query may be complex and sequential. In this case, the router acts as a user, meaning he sees avalible models and their description. This router can then prompt the models with any query agent wants, as many times agent wants (until he runs out of provided tokens) and can even prompt other more specialised routers. This whole routing (jumping between AI agents) is facilitated by smart contract, so the payments happen onchain and the whole sequence can be later analysed. For example, if a user were to query "what is the sum of 2+2? And please tell me the answer in French" the router would first query an AI model specialized in arithmetic to compute the sum, then use the output from the first model as input to a translation model to compute the final result. This 'bouncing' can occur to the nth degree.

Once the appropriate model(s) complete the task, the router sends the final output back to the smart contract, who broadcasts the answer to the frontend for the user. 
