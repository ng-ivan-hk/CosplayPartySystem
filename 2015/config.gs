/* ----- config.gs ----- */
/* Configuration begins */

//System settings
var SPREADSHEET_KEY = '1lmo55S5ExV3dz0kB8UWmGK0DEunWZX1rwf75LcLLAIE';  // https://docs.google.com/spreadsheets/d/{SPREADSHEET_KEY}/edit

var FRONT_END = true ; //if true, the online register form is opened, otherwise false
var BACK_END = true ; //if true, the back-end interface for staff is opened, otherwise false

//Sheet names
var SHEET_NAME_REGISTER = 'register';
var SHEET_NAME_WALKIN = 'walkin';
var SHEET_NAME_LOG_LUGGAGE = 'log_luggage';

//Luggage settings
var LUGGAGE_MAX = 4; //max. no. of luggages allowed for each cosplayer

//Color settings: fill a cell with this color if the following condition is true (Note: only apply to spreadsheet but not webpage)
var COLOR_TOP_ROW = '#f3f3f3'; //the first row (headers)
var COLOR_ARRIVED = '#ffff00'; //cosplayer arrives (default #ffff00 (yellow))
var COLOR_PAID = '#00ff00'; //cosplayer paid (default #00ff00 (green))
var COLOR_LUGGAGE_OUT = '#0000ff'; //luggage is checked out by cosplayer (default #0000ff (blue))
var COLOR_DEFAULT = '#ffffff'; //default color #ffffff (white)

//Column numbers (A=1,B=2...)
var COLUMN_REG_NUMBER = 1; //coloumn which stores registration number
var COLUMN_NAME = 2; //coloumn which stores name
var COLUMN_NICKNAME = 3; //column which stores nickname
var COLUMN_GENDER = 4; //column which stores gender
var COLUMN_PHONE = 5; //coloumn which stores phone
var COLUMN_EMAIL = 6;//coloumn which stores email
var COLUMN_ROLE = 7; //column which stores role (cosplayer or photographer?)
var COLUMN_SOURCE = 8; //column which stores source (how do they know this event?)
var COLUMN_NOTES = 9; //column which stores notes
var COLUMN_SUBMIT_TIME = 10; //column which stores submit time (time when this entry is inserted)
var COLUMN_LUGGAGE = 11; //starting cell column which stores luggage number

//Registration number number of digit settings: only count numbers, do not count the alphabet
var DIGIT_R = 4; // for registered cosplayers (default: 4)
var DIGIT_W = 4; // for walk-in cosplayers (e.g. 4 -> W0001)

/* End of Configuration */


/**
 * Set up the spreadsheet to a specific format that match.
 */
function install(){

  var properties = PropertiesService.getDocumentProperties();
  if(properties.getProperty('install') == 'complete'){ //installed before
    throw 'Installed already.';
    return;
  }
  
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_KEY);
  var registerSheet = spreadsheet.insertSheet(SHEET_NAME_REGISTER, 0);
  
  registerSheet.getRange(1, COLUMN_REG_NUMBER).setValue('登記編號').setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  registerSheet.getRange(1, COLUMN_NAME).setValue('姓名').setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  registerSheet.getRange(1, COLUMN_NICKNAME).setValue('暱稱').setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  registerSheet.getRange(1, COLUMN_GENDER).setValue('性別').setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  registerSheet.getRange(1, COLUMN_PHONE).setValue('電話').setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  registerSheet.getRange(1, COLUMN_EMAIL).setValue('電郵').setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  registerSheet.getRange(1, COLUMN_ROLE).setValue('身份').setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  registerSheet.getRange(1, COLUMN_SOURCE).setValue('來源').setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  registerSheet.getRange(1, COLUMN_NOTES).setValue('備註').setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  registerSheet.getRange(1, COLUMN_SUBMIT_TIME).setValue('SubmitTime').setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  for(var i = 0; i < LUGGAGE_MAX; i++){
    registerSheet.getRange(1, COLUMN_LUGGAGE + i).setValue('行李' + (i+1)).setFontWeight("bold").setBackground(COLOR_TOP_ROW);
  }
  
  registerSheet.setFrozenRows(1);
  registerSheet.setFrozenColumns(3);
  spreadsheet.insertSheet(SHEET_NAME_WALKIN, 1, {template: registerSheet});
  
  //Set installed
  properties.setProperty('install', 'complete');

}
