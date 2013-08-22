module.exports = {
  "title": "",
  "titleAsUrl": "",
  "description": "This is probably your first Corpus, you can use it to play with the app... When you want to make a real corpus, click New : Corpus",
  "team": {
    "gravatar": "",
    "username": "",
    "subtitle": "",
    "description": ""
  },
  "couchConnection": {},
  "replicatedCouchConnections": [],
  "OLAC_export_connections": [],
  "pouchname": "",
  "dateOfLastDatumModifiedToCheckForOldSession": "",
  "confidential": {
    "secretkey": ""
  },
  "publicCorpus": "Private",
  "collection": "private_corpuses",
  "comments": [],
  "datumFields": [{
    "label": "judgement",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "Grammaticality/acceptability judgement (*,#,?, etc). Leaving it blank can mean grammatical/acceptable, or you can choose a new symbol for this meaning.",
    "size": "3",
    "showToUserTypes": "linguist",
    "userchooseable": "disabled"
  }, {
    "label": "utterance",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "checked",
    "help": "Unparsed utterance in the language, in orthography or transcription. Line 1 in your LaTeXed examples for handouts. Sample entry: amigas",
    "showToUserTypes": "all",
    "userchooseable": "disabled"
  }, {
    "label": "morphemes",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "checked",
    "help": "Morpheme-segmented utterance in the language. Used by the system to help generate glosses (below). Can optionally appear below (or instead of) the first line in your LaTeXed examples. Sample entry: amig-a-s",
    "showToUserTypes": "linguist",
    "userchooseable": "disabled"
  }, {
    "label": "gloss",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "checked",
    "help": "Metalanguage glosses of each individual morpheme (above). Used by the system to help gloss, in combination with morphemes (above). It is Line 2 in your LaTeXed examples. We recommend Leipzig conventions (. for fusional morphemes, - for morpheme boundaries etc)  Sample entry: friend-fem-pl",
    "showToUserTypes": "linguist",
    "userchooseable": "disabled"
  }, {
    "label": "syntacticCategory",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "checked",
    "help": "This optional field is used by the machine to help with search and data cleaning, in combination with morphemes and gloss (above). If you want to use it, you can choose to use any sort of syntactic category tagging you wish. It could be very theoretical like Distributed Morphology (Sample entry: √-GEN-NUM), or very a-theroretical like the Penn Tree Bank Tag Set. (Sample entry: NNS) http://www.ims.uni-stuttgart.de/projekte/CorpusWorkbench/CQP-HTMLDemo/PennTreebankTS.html",
    "showToUserTypes": "machine",
    "userchooseable": "disabled"
  }, {
    "label": "syntacticTreeLatex",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "checked",
    "help": "This optional field is used by the machine to make LaTeX trees and help with search and data cleaning, in combination with morphemes and gloss (above). If you want to use it, you can choose to use any sort of LaTeX Tree package (we use QTree by default) Sample entry: Tree [.S NP VP ]",
    "showToUserTypes": "machine",
    "userchooseable": "disabled"
  }, {
    "label": "translation",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "checked",
    "help": "Free translation into whichever language your team is comfortable with (e.g. English, Spanish, etc). You can also add additional custom fields for one or more additional translation languages and choose which of those you want to export with the data each time. Line 3 in your LaTeXed examples. Sample entry: (female) friends",
    "showToUserTypes": "all",
    "userchooseable": "disabled"
  }, {
    "label": "tags",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "Tags for constructions or other info that you might want to use to categorize your data.",
    "showToUserTypes": "all",
    "userchooseable": "disabled"
  }, {
    "label": "validationStatus",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "Any number of tags of data validity (replaces DatumStates). For example: ToBeCheckedWithSeberina, CheckedWithRicardo, Deleted etc...",
    "showToUserTypes": "all",
    "userchooseable": "disabled"
  }],
  "conversationFields": [{
    "label": "participants",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "checked",
    "help": "Use this field to keep track of who your speaker/participants are. You can use names, initials, or whatever your consultants prefer.",
    "userchooseable": "disabled"
  }, {
    "label": "modality",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "Use this field to indicate if this is a voice or gesture tier, or a tier for another modality.",
    "userchooseable": "disabled"
  }],
  "sessionFields": [{
    "label": "goal",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "The goals of the elicitation session, it could be why you set up the meeting, or some of the core contexts you were trying to elicit. Sample: collect some anti-passives",
    "userchooseable": "disabled"
  }, {
    "label": "consultants",
    "value": "",
    "mask": "",
    "encrypted": "",
    "consultantMasks": [],
    "shouldBeEncrypted": "",
    "help": "This is a comma seperated field of all the consultants who were present for this elicitation session. This field also contains a (hidden) array of consultant masks with more details about the consultants if they are not anonymous or are actual users of the system. ",
    "userchooseable": "disabled"
  }, {
    "label": "dialect",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "The dialect of this session (as precise as you'd like).",
    "userchooseable": "disabled"
  }, {
    "label": "language",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "The language (or language family), if desired.",
    "userchooseable": "disabled"
  }, {
    "label": "dateElicited",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "The date when the session took place.",
    "userchooseable": "disabled"
  }, {
    "label": "user",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "This is the username of who created this elicitation session. There are other fields contains an array of participants and consultants. ",
    "userchooseable": "disabled"
  }, {
    "label": "participants",
    "value": "",
    "mask": "",
    "encrypted": "",
    "participantMasks": [],
    "shouldBeEncrypted": "",
    "help": "This is a comma seperated field of all the people who were present for this elicitation session. This field also contains a (hidden) array of user masks with more details about the people present, if they are not anonymous or are actual users of the system. ",
    "userchooseable": "disabled"
  }, {
    "label": "dateSEntered",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "This field is deprecated, it was replaced by DateSessionEntered",
    "userchooseable": "disabled"
  }, {
    "label": "DateSessionEntered",
    "value": "",
    "mask": "",
    "encrypted": "",
    "shouldBeEncrypted": "",
    "help": "This is the date in which the session was entered.",
    "userchooseable": "disabled"
  }],
  "publicSelf": {
    "title": "Private Corpus",
    "titleAsUrl": "private_corpus",
    "description": "The details of this corpus are not public.",
    "couchConnection": {},
    "pouchname": "",
    "id": "corpus",
    "datumFields": [{
      "label": "judgement",
      "value": "",
      "mask": "",
      "encrypted": "",
      "shouldBeEncrypted": "",
      "help": "Grammaticality/acceptability judgement of this data.",
      "size": "3",
      "showToUserTypes": "linguist",
      "userchooseable": "disabled"
    }, {
      "label": "gloss",
      "value": "",
      "mask": "",
      "encrypted": "",
      "shouldBeEncrypted": "checked",
      "help": "Metalanguage glosses of each individual morpheme (morphemes are pieces ofprefix, suffix) Sample entry: friend-fem-pl",
      "showToUserTypes": "linguist",
      "userchooseable": "disabled"
    }, {
      "label": "syntacticCategory",
      "value": "",
      "mask": "",
      "encrypted": "",
      "shouldBeEncrypted": "checked",
      "help": "This optional field is used by the machine to help with search.",
      "showToUserTypes": "machine",
      "userchooseable": "disabled"
    }, {
      "label": "syntacticTreeLatex",
      "value": "",
      "mask": "",
      "encrypted": "",
      "shouldBeEncrypted": "checked",
      "help": "This optional field is used by the machine to make LaTeX trees and help with search and data cleaning, in combination with morphemes and gloss (above). Sample entry: Tree [.S NP VP ]",
      "showToUserTypes": "machine",
      "userchooseable": "disabled"
    }, {
      "label": "tags",
      "value": "",
      "mask": "",
      "encrypted": "",
      "shouldBeEncrypted": "",
      "help": "Tags for constructions or other info that you might want to use to categorize your data.",
      "showToUserTypes": "all",
      "userchooseable": "disabled"
    }, {
      "label": "validationStatus",
      "value": "",
      "mask": "",
      "encrypted": "",
      "shouldBeEncrypted": "",
      "help": "Any number of tags of data validity (replaces DatumStates). For example: ToBeCheckedWithSeberina, CheckedWithRicardo, Deleted etc...",
      "showToUserTypes": "all",
      "userchooseable": "disabled"
    }],
    "sessionFields": [{
      "label": "dialect",
      "value": "",
      "mask": "",
      "encrypted": "",
      "shouldBeEncrypted": "",
      "help": "You can use this field to be as precise as you would like about the dialect of this session.",
      "userchooseable": "disabled"
    }, {
      "label": "language",
      "value": "",
      "mask": "",
      "encrypted": "",
      "shouldBeEncrypted": "",
      "help": "This is the langauge (or language family), if you would like to use it.",
      "userchooseable": "disabled"
    }, {
      "label": "dateElicited",
      "value": "",
      "mask": "",
      "encrypted": "",
      "shouldBeEncrypted": "",
      "help": "This is the date in which the session took place.",
      "userchooseable": "disabled"
    }],
    "comments": []
  }
};