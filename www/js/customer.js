var GAT = GAT || {};

GAT.customer = function() {
    var s = {};

    s.cache = {};

    var loadInProgress = {}; //{customerId: Future}

    var loader = new GAT.utils.BackgroundLoader();

    var Customer = function() {
        this.name = null;
        this.id = null;
        this.phone = null;
        this.email = null;
        this.transactionIds = [];
        this.autoGenName = false;
    };

    var generateName = function(customerId) {
        var indexLen = 6;

        var nounIndex = customerId.substring(0, indexLen) % nounList.length;
        var adjectiveIndex = customerId.substring(customerId.length - customerId) %
                adjectiveList.length;
        return adjectiveList[adjectiveIndex] + " " + nounList[nounIndex];
    };

    var updateFromResp = function(fullresp) {
        var resp = fullresp.customer;
        var customer = (resp.uuid in s.cache) ? s.cache[resp.uuid] : new Customer();
        customer.id = resp.uuid;
        if ("first_name" in resp && "last_name" in resp) {
            customer.name = resp.first_name + " "+ resp.last_name;
            customer.autoGenName = false;
        } else {
            customer.name = generateName(resp.uuid);
            customer.autoGenName = true;
        }
        customer.phone = null;
        if ("phone_number" in resp)
            customer.phone = resp.phone_number;
        customer.email = null;
        if ("email" in resp)
            customer.email = resp.email;
        customer.transactionIds = [];
        if ("active_transaction_uuids" in resp)
            customer.transactionIds = resp.active_transaction_uuids;
        if ("inactive_transaction_uuids" in resp)
            customer.transactionIds.push.apply(customer.transactionIds, resp.inactive_transaction_uuids);
        s.cache[customer.id] = customer;
    };

    s.load = function(customerId) {
        if (customerId in loadInProgress)
            return loadInProgress[customerId];
        var future = new GAT.utils.Future();
        if (customerId in s.cache) {
            future.notify(s.cache[customerId], true);
        } else {
            loadInProgress[customerId] = future;
            loader.add(function() {
                return GAT.webapi.getCustomer(customerId).
                    onSuccess(function(resp) {
                        updateFromResp(resp);
                        delete loadInProgress[customerId];
                        future.notify(true, s.cache[customerId]);
                    }).
                    onError(function(resp) {
                        delete loadInProgress[customerId];
                        future.notify(false, resp);
                    });
            });
        }
        return future;
    };

    s.deepLoad = function(customerId) {
        var load = function() {
            var customer = s.cache[customerId];
            GAT.transaction.loadList(customer.transactionIds);
        };

        if (customerId in s.cache) {
            load();
        } else {
            s.load(customerId).onSuccess(function() {
                load();
            });
        }
    };

    var adjectiveList = ["Adorable", "Adventurous", "Aggressive", "Alert", "Attractive", "Average", "Beautiful", "Blue-eyed ", "Bloody", "Blushing", "Bright", "Clean", "Clear", "Cloudy", "Colorful", "Crowded", "Cute", "Dark", "Drab", "Distinct", "Dull", "Elegant", "Excited", "Fancy", "Filthy", "Glamorous", "Gleaming", "Gorgeous", "Graceful", "Grotesque", "Handsome", "Homely", "Light", "Long", "Magnificent", "Misty", "Motionless", "Muddy", "Old-fashioned", "Plain", "Poised", "Precious", "Quaint", "Shiny", "Smoggy", "Sparkling", "Spotless", "Stormy", "Strange", "Ugly", "Ugliest", "Unsightly", "Unusual", "Wide-eyed", "Alive", "Annoying", "Bad", "Better", "Beautiful", "Brainy", "Breakable", "Busy", "Careful", "Cautious", "Clever", "Clumsy", "Concerned", "Crazy", "Curious", "Dead", "Different", "Difficult", "Doubtful", "Easy", "Expensive", "Famous", "Fragile", "Frail", "Gifted", "Helpful", "Helpless", "Horrible", "Important", "Impossible", "Inexpensive", "Innocent", "Inquisitive", "Modern", "Mushy", "Odd", "Open", "Outstanding", "Poor", "Powerful", "Prickly", "Puzzled", "Real", "Rich", "Shy", "Sleepy", "Stupid", "Super", "Talented", "Tame", "Tender", "Tough", "Uninterested", "Vast", "Wandering", "Wild", "Wrong", "Agreeable", "Amused", "Brave", "Calm", "Charming", "Cheerful", "Comfortable", "Cooperative", "Courageous", "Delightful", "Determined", "Eager", "Elated", "Enchanting", "Encouraging", "Energetic", "Enthusiastic", "Excited", "Exuberant", "Fair", "Faithful", "Fantastic", "Fine", "Friendly", "Funny", "Gentle", "Glorious", "Good", "Happy", "Healthy", "Helpful", "Hilarious", "Jolly", "Joyous", "Kind", "Lively", "Lovely", "Lucky", "Nice", "Obedient", "Perfect", "Pleasant", "Proud", "Relieved", "Silly", "Smiling", "Splendid", "Successful", "Thankful", "Thoughtful", "Victorious", "Vivacious", "Witty", "Wonderful", "Zealous", "Zany", "Broad", "Chubby", "Crooked", "Curved", "Deep", "Flat", "High", "Hollow", "Low", "Narrow", "Round", "Shallow", "Skinny", "Square", "Steep", "Straight", "Widebig", "Colossal", "Fat", "Gigantic", "Great", "Huge", "Immense", "Large", "Little", "Mammoth", "Massive", "Miniature", "Petite", "Puny", "Scrawny", "Short", "Small", "Tall", "Teeny", "Teeny-tiny", "Tiny", "Bitter", "Delicious", "Fresh", "Juicy", "Ripe", "Rotten", "Salty", "Sour", "Spicy", "Stale", "Sticky", "Strong", "Sweet", "Tart", "Tasteless", "Tasty", "Thirsty", "Fluttering", "Fuzzy", "Greasy", "Grubby", "Hard", "Hot", "Icy", "Loose", "Melted", "Nutritious", "Plastic", "Prickly", "Rainy", "Rough", "Scattered", "Shaggy", "Shaky", "Sharp", "Shivering", "Silky", "Slimy", "Slippery", "Smooth", "Soft", "Solid", "Steady", "Sticky", "Tender", "Tight", "Uneven", "Weak", "Wet", "Wooden", "Yummy", "Boiling", "Breezy", "Broken", "Bumpy", "Chilly", "Cold", "Cool", "Creepy", "Crooked", "Cuddly", "Curly", "Damaged", "Damp", "Dirty", "Dry", "Dusty", "Filthy", "Flaky", "Fluffy", "Freezing", "Hot", "Warm", "Wet", "Abundant", "Empty", "Few", "Heavy", "Light", "Many", "Numerous", "Substantial"];

    var nounList = ["Aardvark", "Albatross", "Rookery", "Gam", "Alligator", "Alpaca", "Amphibian", "Anaconda", "Ant", "Pupa", "Worker", "Soldier", "Bike", "Colony", "Nest", "Swarm", "Myrmicine", "Anteater", "Antelope", "Cluster", "Tribe", "Bubaline", "Antilopine", "Antlion", "Ape", "Troop", "Simian", "Aphid", "Armadillo", "Baby", "Asp", "Ass/donkey", "Coffle", "Drove", "Pace", "Baboon", "Troop", "Badger", "Kit", "Colony", "Musteline", "Bandicoot", "Barnacle", "Barracuda", "Basilisk", "Bass", "Bat", "Colony", "Flock", "Noctillionine", "Bear", "She-bear", "Sloth", "Beaver", "Kitten", "Pup", "Colony", "Bee", "Pupa", "Worker", "Cluster", "Colony", "Drift", "Erst", "Grist", "Hive", "Nest", "Rabble", "Stand", "Swarm", "Apian", "Apiarian", "Bedbug", "Beetle", "Bird", "Flight", "Pod", "Bison", "Bubaline", "Blackbird", "Bluejay", "Boa", "Boar", "Also", "Farrow", "Shoat/shote", "Sow", "Singular", "Groups", "Sounder", "Bobcat", "Buffalo,", "(for", "Troop", "Gang", "Obstinancy", "Butterfly", "Larva", "Pupa", "Chrysalis", "Flutter", "Rabble", "Pieridine", "Pierine", "Lepidopteran", "Buzzard", "Camel", "Flock", "Herd", "Train", "Cameline", "Capybara", "Cardinal", "Caribou", "Carp", "Cassowary", "Chick", "Cat", "Kit", "Queen", "Pussy", "Gib", "Cluster", "Clutter", "Glaring", "Pounce", "Kindle", "Litter", "Feline", "Caterpillar", "Catfish", "Cattle", "Drove", "Yoke", "Team", "Taurine", "Vaccine", "Vituline", "Veal", "Centipede", "Chameleon", "Chamois", "Cheetah", "Chickadee", "Chicken", "Pullet", "Cock", "Cockerel", "Capon", "Brood", "Peep", "Clutch", "Chimpanzee", "Chinchilla", "Sow", "Bull", "Chipmunk", "Chough", "Clattering", "Clam", "Clownfish", "Coati", "Kit", "Cobra", "Cockroach", "Cod", "Gadoid", "Gadine", "Condor", "Constrictor", "Coral", "Cormorant", "Shaglet", "Flight", "Cougar", "Coyote", "Puppy", "Cub", "Whelp", "Crab", "Jenny", "Jimmy", "Crane", "Colt", "Sedge", "Sege", "Siege", "Crawdad", "Crayfish", "Cricket", "Crocodile", "Congregation", "Float", "Nest", "Crow", "Cuckoo", "Curlew", "Damselfly", "Deer", "Fawn", "Hind", "Cow", "Stag", "Bull", "Hart", "Herd", "Mob", "Rangale", "Elaphine", "Humble", "Dingo", "Dinosaur", "Juvenile", "Pack", "Dog", "Puppy", "Whelp", "Dog", "Stud", "Sire", "Kennel", "Mute", "Litter", "Cowardice", "Comedy", "Cry", "Dogfish", "Squaloid", "Rock", "Flake", "Huss", "Rigg", "Kahada", "Dolphin", "Pup", "Pod", "Herd", "Team", "Donkey", "Dormouse", "Dotterel", "Dove", "Cote", "Dole", "Dule", "Flight", "Piteousness", "Pitying", "Dragonfly", "Drake", "Flight", "Duck", "Also", "Hen", "Flock", "Herd", "Badling", "Brace", "Safe", "Sord", "Sore", "Waddling", "On", "Bunch", "Paddling", "Raft", "In", "Skein", "String", "Team", "Fuliguline", "Dugong", "Dung", "Dunlin", "Eagle", "Fledgling", "Earthworm", "Earwig", "Echidna", "(in", "Eel", "Elver", "Swarm", "Anguilline", "Egret", "Eland", "Elephant", "Memory", "Proboscine", "Proboscidean", "Elephant", "Pack", "Miroungan", "Elk", "Herd", "Emu", "Hatchling", "Ermine", "Falcon", "Tercel", "Terzel", "Ferret", "Business", "Finch", "Firefly", "Fish", "Fingerling", "Flamingo", "Flea", "Fly", "Cloud", "Swarm", "Flyingfish", "Fox", "Kit", "Pup", "Dog", "Reynard", "Skulk", "Frog", "Tadpole", "Froglet", "Fruit", "Gaur", "Gaurine", "Gazelle", "Gecko", "Gerbil", "Giant", "Giant", "Gibbon", "Gila", "Giraffe", "Corps", "Tower", "Gnat", "Horde", "Swarm", "Gnu", "Implausibility", "Goat", "Doe", "Doeling", "Buck", "Buckling", "Cabrito", "Mutton", "Goose", "Flock", "Gaggle", "Herd", "In", "Skein", "Team", "Wedge", "Anserine", "Goldfinch", "Goldfish", "Gopher", "Gorilla", "Silverback", "Troop", "Whoop", "Goshawk", "Grasshopper", "Swarm", "Grouse", "Grizzly", "Guanaco", "Guinea", "Flock", "Guinea", "Gull", "Hen", "Flock", "Guppy", "Haddock", "Halibut", "Hamster", "Hare", "Jill", "Jack", "Down", "Drove", "Flick", "Husk", "Leporine", "Hawk", "Aerie", "Staff", "Leash", "Flight", "Flock", "Migrating", "Kettle", "Boil", "Cauldron", "Falconine", "Hedgehog", "Piglet", "Pup", "Hermit", "Heron", "Sedge", "Sege", "Siege", "Herring", "Glean", "Shoal", "Hippopotamus", "Herd", "Thunder", "Hookworm", "Hornet", "Pupae", "Swarm", "Horse", "Colt", "Filly", "Gelding", "Dam", "Stud", "Stud", "Harras", "Herd", "Band", "Team", "Rag", "String", "Field", "Hummingbird", "Trochilidine", "Hyena", "Pup", "Whelp", "Ibex", "Ibis", "Iguana", "Impala", "Jackal", "Jaguar", "Leap", "Jay", "Scold", "Jay,", "Jellyfish", "Polyp", "Ephyra", "Fluther", "Smack", "Smuth", "Kangaroo", "Doe", "Jill", "Roo", "Buck", "Jack", "Herd", "Troop", "Mob", "Killer", "Kingfisher", "Kinkajou", "Kit", "Convergence", "Kiwi", "Koala", "Koi", "Komodo", "Chick", "Calf", "Hen", "Cock", "Kookabura", "Kouprey", "Bovine", "Krill", "Kudu", "Ladybug", "Lapwing", "Desert", "Lamprey", "Lark", "Leech", "Lemming", "Lemur", "Conspiracy", "Lemurine", "Leopard", "Lepe", "Lion", "Sawt", "Leonine", "Lizard", "Llama", "Flock", "Lobster", "Locust", "Host", "Swarm", "Loon", "Loris", "Louse", "Pediculine", "Lynx", "Lyrebird", "Macaw", "Mackerel", "Magpie", "Mallard", "Also", "Suit", "Manatee", "Sirenian", "Mandrill", "Manta", "Mantis", "Marlin", "Marmoset", "Marmot", "Marsupial", "Marten", "Meadowlark", "Meerkat", "Mink", "Kit", "Minnow", "Mite", "Mockingbird", "Mole", "Mollusk", "Mongoose", "Committee", "Delegation", "Monkey", "Moose", "Mouse", "Pup", "As", "Pinky/fuzzy/crawler/hopper", "Mischief", "Nest", "Mosquito", "Wriggler", "Tumbler", "Cloud", "Anopheline", "Moth", "Mountain", "Mouse", "Mule", "John", "Muskox", "Narwhal", "Newt", "Nightingale", "Philomelian", "Ocelot", "Octopus", "Okapi", "Opossum", "Orangutan", "Orca", "Oryx", "Ostrich", "Chick", "Troop", "Struthious", "Otter", "Whelp", "Lutrine", "Owl", "Owlet", "Strigine", "Oyster", "Panther", "Parrot", "Panda-", "Partridge", "Chantelle", "Peafowl", "Peachick", "Pelican", "Nestling", "Penguin", "Nestling", "Raft", "Rookery", "Colony", "Huddle", "Pheasant", "Pig", "Also", "Farrow", "Shoat/shote", "Gilt", "Barrow", "Drove", "Litter", "Suilline", "Ham", "Bacon", "Pigeon", "Squeaker", "Polar", "Celebration", "Pack", "Ursine", "Pony", "Porcupine", "Porpoise", "School", "Shoal", "Prairie", "Quail", "Quelea", "Queline", "Quetzal", "Rabbit", "Kit", "Kitten", "Nestling", "Jill", "Jack", "(young)wrack", "Nest", "Raccoon", "Kit", "Nursery", "Committee", "Smack", "Brace", "Troop", "Rail", "Ram", "Also", "Ovine", "Mutton", "Rat", "Pup", "Cow", "Bull", "Horde", "Raven", "Red", "Hart", "Red", "Reindeer", "Rhinoceros", "Rodent", "Rook", "Parliament", "Salamander", "Salamandrine", "Salmon", "Sand", "Juvenile", "Sandpiper", "Sardine", "Scorpion", "Sea", "Calf", "Sea", "Juvenile", "Seahorse", "Seal", "Shark", "Pup", "Squaloid", "Sheep", "Also", "Lambkin", "Cosset", "Dam", "Buck", "Fold", "Herd", "Mutton", "Hoggett", "Shrew", "Drove", "Skunk", "Sloth", "Pup", "Baby", "Snail", "Snake", "Hatchling", "Neonate", "Ball", "Elapine", "Serpentine", "Viperine", "Ophidian", "Sparrow", "Spider", "Arachnoid", "Spoonbill", "Squid", "Squirrel", "Kit", "Kitten", "Starling", "Murmuration", "Stingray", "Stinkbug", "Stork", "Swallow", "Swan", "Flapper", "Tapir", "Tapirine", "Tarantula", "Tarsier", "Tarsiine", "Termite", "Nest", "Swarm", "Tiger", "Whelp", "Streak", "Toad", "Toadlet", "Batrachian", "Trout", "Turkey", "Gobbler", "Stag", "Jake", "Turtle", "Vicu\u00f1a", "Herd", "Viper", "Vulture", "Wallaby", "Walrus", "Flock", "Odobenine", "Wasp", "Worker", "Hive", "Colony", "Nest", "Water", "Weasel", "Kit", "Doe", "Jill", "Dog", "Hub", "Jack", "Sneak", "Whale", "School", "Cetaceous", "Wildcat", "Wolf", "Puppy", "Cub", "Whelp", "She-wolf", "Lupine", "Canine", "Wolverine", "Whelp", "Musteline", "Wombat", "Woodcock", "Woodpecker", "Worm", "Vermian", "Wren", "Yak", "Zebra", "Foal", "Cohort", "Dazzle", "Zeal", "Hippotigrine"];

    return s;
}();
