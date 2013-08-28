module.exports = {
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
};