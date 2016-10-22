/*
----- code.gs -----
******************************
HKU Cosplay Party System 2015
******************************
*/
var CP_VERSION = '1.1.2'; //Last update: 2015-11-10
/*


*********** Author ***********
The Animation and Comics Association, HKUSU
Created by Ng Yik Fan, Information Secretary of session 2013 - 2014

*********** Notice ***********
Please see the documentation CosplayPartySystem2015_Guide.pdf for details.
This file is created along with the following 7 files:
config.gs
index.html
common.html
user_luggage.html
user_checkin.html
user_walkin.html
nav.html

See updates at the bottom of this file.

*/



/**
 * Main function: load *.html depending on GET variable
 */
function doGet(request) {
  
  var filename = 'index';
  var title = 'HKU Cosplay Party 2015 網上登記表格';
  
  if(BACK_END){ //Handle GET variable only if BACK_END is on
    switch (request.parameter.a) {
      case 'checkin':
        filename = 'user_checkin';
        title = '2015CPTEST: Check-in';
        break;
      case 'walkin':
        filename = 'user_walkin';
        title = '2015CPTEST: Walk-in';
        break;
      case 'luggage':
        filename = 'user_luggage';
        title = '2015CPTEST: Luggage';
        break;
    }
  }
  
  return HtmlService.createTemplateFromFile(filename).evaluate()
  .setTitle(title)
  .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  
}

/**
 * Include a HTML file inside another HTML file.
 * Example: <?!= include('common') ?>
 * @param filename Filename without file extension (.html)
 * @return the HTML file content
 */
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate()
  .setSandboxMode(HtmlService.SandboxMode.IFRAME)
  .getContent();
}

/**
 * Register online.
 * @param form HTML form object
 * @return JSON object
 */
function onlineRegister(form){
  return cosplayerRegister_(form, 1);
}

/**
 * Walk-in registration.
 * @param form HTML form object
 * @return JSON object
 */
function walkinRegister(form){
  return cosplayerRegister_(form, 0);
}

/**
 * Check luggage info of a cosplayer.
 * @param form HTML form object
 * @return JSON object
 */
function checkLuggage(form){

  var rawInput = form.regNumber;
  var regNumber = 0;
  
  if(rawInput.length == 8){
    regNumber = convertPhoneToRegNumber_(rawInput);
    if(!regNumber){
      return {"status": "error", "message": "找不到以該電話號碼登記的編號。可嘗試於試算表內搜尋登記者資訊。"};
    }
  } else {
    regNumber = convertToStandardRegNumber_(rawInput);
  }
  
  return checkLuggageByRegNumber_(regNumber);
}

/**
 * Check luggage info of a cosplayer by registration number.
 * @param regNumber Registration number (after standardized)
 * @return JSON object
 */
function checkLuggageByRegNumber_(regNumber){
  
  var json;
  
  /* Search the row in the spreadsheet */
  var decideWhichSheetToUse = regNumber.charAt(0) == 'R' ? SHEET_NAME_REGISTER : SHEET_NAME_WALKIN;
  var sheet = SpreadsheetApp.openById(SPREADSHEET_KEY).getSheetByName(decideWhichSheetToUse);
  var regNumberCell = searchRegNumber_(sheet, regNumber);
  
  /* Return luggage info as array in JSON */
  if(regNumberCell){
  
    var name = sheet.getRange(regNumberCell.getRow(), COLUMN_NAME).getValue();
    var nickname = sheet.getRange(regNumberCell.getRow(), COLUMN_NICKNAME).getValue();
    var gender = sheet.getRange(regNumberCell.getRow(), COLUMN_GENDER).getValue();
    var phone = sheet.getRange(regNumberCell.getRow(), COLUMN_PHONE).getValue();
    var role = sheet.getRange(regNumberCell.getRow(), COLUMN_ROLE).getValue();
    var notes = sheet.getRange(regNumberCell.getRow(), COLUMN_NOTES).getValue();
    
    var arrived = regNumberCell.getBackground() == COLOR_ARRIVED? 1 : 0 ; 
    
    json = {"status": "success",
    "regNumber": regNumber , "name": name, "nickname": nickname, "gender": gender, "phone": phone, "role": role, "notes": notes,
    "arrived": arrived, "luggages": []};
    
    // Loop through each luggage
    for(var i = 0; i < LUGGAGE_MAX; i++){
      var luggageCell = sheet.getRange(regNumberCell.getRow(), COLUMN_LUGGAGE + i );
      var luggageValue = luggageCell.getValue();
      var outValue = luggageCell.getBackground() == COLOR_LUGGAGE_OUT ? 1 : 0 ;
      json.luggages.push( { "luggage" : luggageValue , "out" : outValue } );
    }

    return json;
  
  } else {
    return {"status": "error", "message": "找不到該登記編號。請確認登記編號正確無誤。"};
  }
  
}

/**
 * Set/change luggage info of a cosplayer.
 * @param form HTML form object
 * @return JSON object
 */
function setLuggage(form){
  
  var json;
  var regNumberValue = form.regNumber;
  
  /* Search the row in the spreadsheet */
  var decideWhichSheetToUse = regNumberValue.charAt(0) == 'R' ? SHEET_NAME_REGISTER : SHEET_NAME_WALKIN;
  var sheet = SpreadsheetApp.openById(SPREADSHEET_KEY).getSheetByName(decideWhichSheetToUse);
  var regNumberCell = searchRegNumber_(sheet, regNumberValue);
  
  /* Set value and check luggage again */
  if(regNumberCell){
  
    var logRow = [0, 0];
    
    for(var i = 0; i < LUGGAGE_MAX; i++){
    
      var luggageValue = escapeFormula_(form["l" + (i+1) ]);
    
      var luggageCell = sheet.getRange(regNumberCell.getRow(), COLUMN_LUGGAGE + i );
      luggageCell.setValue(luggageValue);
      
      //Change color
      if(form["l" + (i+1) + "out"] && luggageValue ){ //in order to highlight it as OUT, cell must have value
        luggageCell.setBackground(COLOR_LUGGAGE_OUT);
      } else {
        luggageCell.setBackground(COLOR_DEFAULT);
      }
      
    }
    
    SpreadsheetApp.flush();
    
    //Check again
    return checkLuggageByRegNumber_(regNumberValue);
    
  } else {
    return {"status": "error", "message": "Not found"};
  }
  
}

/**
 * Check personal info of a cosplayer.
 * @param form HTML form object
 * @return JSON object
 */
function checkCosplayer(form){

  var rawInput = form.regNumber;
  var regNumber = 0;
  
  if(rawInput.length == 8){
    regNumber = convertPhoneToRegNumber_(rawInput);
    if(!regNumber){
      return {"status": "error", "message": "找不到以該電話號碼登記的編號。可嘗試於試算表內搜尋登記者資訊。"};
    }
  } else {
    regNumber = convertToStandardRegNumber_(rawInput);
  }
  
  return checkCosplayerByRegNumber_(regNumber);
}

/**
 * Check personal info of a cosplayer by registration number.
 * @param regNumber Registration number (after standardized)
 * @return JSON object
 */
function checkCosplayerByRegNumber_(regNumber){
  var json;
  
  /* Search the row in the spreadsheet */
  var decideWhichSheetToUse = regNumber.charAt(0) == 'R' ? SHEET_NAME_REGISTER : SHEET_NAME_WALKIN;
  var sheet = SpreadsheetApp.openById(SPREADSHEET_KEY).getSheetByName(decideWhichSheetToUse);
  var regNumberCell = searchRegNumber_(sheet, regNumber);
  
  /* Return cosplayer info as array in JSON */
  if(regNumberCell){
  
    var name = sheet.getRange(regNumberCell.getRow(), COLUMN_NAME).getValue();
    var nickname = sheet.getRange(regNumberCell.getRow(), COLUMN_NICKNAME).getValue();
    var gender = sheet.getRange(regNumberCell.getRow(), COLUMN_GENDER).getValue();
    var phone = sheet.getRange(regNumberCell.getRow(), COLUMN_PHONE).getValue();
    var email = sheet.getRange(regNumberCell.getRow(), COLUMN_EMAIL).getValue();
    var role = sheet.getRange(regNumberCell.getRow(), COLUMN_ROLE).getValue();
    //note: helper do not need to know source
    var notes = sheet.getRange(regNumberCell.getRow(), COLUMN_NOTES).getValue();
    
    var arrived = regNumberCell.getBackground() == COLOR_ARRIVED? 1 : 0 ; 
    var paid = sheet.getRange(regNumberCell.getRow(), COLUMN_NAME).getBackground() == COLOR_PAID? 1 : 0 ; 
    
    json = {"status": "success", "regNumber": regNumber,
            "name": name, "nickname": nickname, "gender": gender, "phone": phone, "email": email, "role": role, "notes": notes,
            "arrived": arrived, "paid": paid};
    return json;
  
  } else {
    return {"status": "error", "message": "找不到該登記編號。可嘗試用電話號碼搜尋，或在試算表內以其他資料搜尋。"};
  }
}

/**
 * Set/change personal info of a cosplayer.
 * @param form HTML form object
 * @return JSON object
 */
function setCosplayer(form){
  
  var json;
  var regNumberValue = form.regNumber;
  
  /* Search the row in the spreadsheet */
  var decideWhichSheetToUse = regNumberValue.charAt(0) == 'R' ? SHEET_NAME_REGISTER : SHEET_NAME_WALKIN;
  var sheet = SpreadsheetApp.openById(SPREADSHEET_KEY).getSheetByName(decideWhichSheetToUse);
  var regNumberCell = searchRegNumber_(sheet, regNumberValue);
  
  /* Set value and check again */
  if(regNumberCell){

    if(form['arrived']){
      regNumberCell.setBackground(COLOR_ARRIVED);
    } else {
      regNumberCell.setBackground(COLOR_DEFAULT);
    }
    
    if(form['paid']){
      sheet.getRange(regNumberCell.getRow(), COLUMN_NAME).setBackground(COLOR_PAID);
    } else {
      sheet.getRange(regNumberCell.getRow(), COLUMN_NAME).setBackground(COLOR_DEFAULT);
    }
    
    sheet.getRange(regNumberCell.getRow(), COLUMN_NOTES).setValue(escapeFormula_(form.notes));
    
    SpreadsheetApp.flush();

    return checkCosplayerByRegNumber_(regNumberValue);
    
  } else {
    return {"status": "error", "message": "Not found"};
  }
  
}

/*
************************************************************************
                    PRIVATE HELPER FUNCTIONS
************************************************************************
*/

/**
 * Insert the data submitted by user (cosplayer) to spreadsheet.
 * If online registration, send an email.
 * @param form HTML form object
 * @param online 1->online, 0->walk in
 * @return JSON object containing either a registration number on success, or an error message on failure
 */
function cosplayerRegister_(form, online){
  
  var json;
  
  try{
    
    /* Get form input from user */
    var nameValue = escapeFormula_(form.name);
    var nicknameValue = escapeFormula_(form.nickname);
    var genderValue = (form.gender == 'male' ? '男' : '女');
    var phoneValue = form.phone;
    var emailValue = form.email;
    var roleValue = escapeFormula_(form.role);
    var sourceValue = escapeFormula_( form.source == 'others' ? ( form.sourceText ? form.sourceText : form.source  ) : form.source );
    var notesValue = escapeFormula_( online? '' : form.notes );
    
    /* Validate data */
    //All fields filled in?
    if( !(nameValue && nicknameValue && genderValue && phoneValue && emailValue && roleValue && sourceValue) ){
      return {"status": "error", "message": "請填入所有欄位。"};
    }
    //Validate phone number
    if(!/^\d+$/.test(phoneValue) || phoneValue.length != 8 ){
      return {"status": "error", "message": "電話號碼應為8位數字。"};
    }
    //Validate email pattern
    var email_re = /(?:(?:\r\n)?[ \t])*(?:(?:(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*))*@(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*|(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*)*\<(?:(?:\r\n)?[ \t])*(?:@(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*(?:,@(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*)*:(?:(?:\r\n)?[ \t])*)?(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*))*@(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*\>(?:(?:\r\n)?[ \t])*)|(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*)*:(?:(?:\r\n)?[ \t])*(?:(?:(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*))*@(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*|(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*)*\<(?:(?:\r\n)?[ \t])*(?:@(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*(?:,@(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*)*:(?:(?:\r\n)?[ \t])*)?(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*))*@(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*\>(?:(?:\r\n)?[ \t])*)(?:,\s*(?:(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*))*@(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*|(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*)*\<(?:(?:\r\n)?[ \t])*(?:@(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*(?:,@(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*)*:(?:(?:\r\n)?[ \t])*)?(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|"(?:[^\"\r\\]|\\.|(?:(?:\r\n)?[ \t]))*"(?:(?:\r\n)?[ \t])*))*@(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*)(?:\.(?:(?:\r\n)?[ \t])*(?:[^()<>@,;:\\".\[\] \000-\031]+(?:(?:(?:\r\n)?[ \t])+|\Z|(?=[\["()<>@,;:\\".\[\]]))|\[([^\[\]\r\\]|\\.)*\](?:(?:\r\n)?[ \t])*))*\>(?:(?:\r\n)?[ \t])*))*)?;\s*)/;
    if(!email_re.test(emailValue)){
      return {"status": "error", "message": "請確認電郵地址格式正確。"};
    }
    
    /* Add a new row to spreadsheet */
  
    // We use Lock Service (server-side mutual lock) to ensure two users get different registration number
    var lock = LockService.getPublicLock();
    if (lock.tryLock(10000))  {
    
      //We get the ticket number! Now we can use this ticket number to add a new row.
      var sheet = SpreadsheetApp.openById(SPREADSHEET_KEY).getSheetByName( (online ? SHEET_NAME_REGISTER : SHEET_NAME_WALKIN) );
      var newRow = sheet.getLastRow() + 1;
      var regNumber = (online ? 'R' : 'W') + appendZero_(newRow - 1, (online ? DIGIT_R : DIGIT_W));
      
      sheet.getRange(newRow, COLUMN_REG_NUMBER).setValue(regNumber);
      sheet.getRange(newRow, COLUMN_NAME).setNumberFormat('@STRING@').setValue(nameValue);
      sheet.getRange(newRow, COLUMN_NICKNAME).setNumberFormat('@STRING@').setValue(nicknameValue);
      sheet.getRange(newRow, COLUMN_GENDER).setValue(genderValue);
      sheet.getRange(newRow, COLUMN_PHONE).setNumberFormat('@STRING@').setValue(phoneValue);
      sheet.getRange(newRow, COLUMN_EMAIL).setNumberFormat('@STRING@').setValue(emailValue);
      sheet.getRange(newRow, COLUMN_ROLE).setNumberFormat('@STRING@').setValue(roleValue);
      sheet.getRange(newRow, COLUMN_SOURCE).setNumberFormat('@STRING@').setValue(sourceValue);
      sheet.getRange(newRow, COLUMN_NOTES).setNumberFormat('@STRING@').setValue(notesValue);
      sheet.getRange(newRow, COLUMN_SUBMIT_TIME).setNumberFormat('@STRING@').setValue(Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss "));
      
      SpreadsheetApp.flush(); //make sure the above Spreadsheet operation is completed
      
      lock.releaseLock();
      
    } else {
      return {"status": "error", "message": "互斥鎖超時，請嘗試重新輸入。"};
    }
    
    
    if(online){ //if online, send an email
      
      /* Send Email */
      var emailHeader = '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n'; // Set UTF-8
      var emailBody = nameValue + '，您好！<br><br>您的登記編號是: ' + regNumber;
      
      MailApp.sendEmail({
        name: "CP Ex-co",
        to: emailValue,
        subject: "CP Event Registration",
        htmlBody: emailHeader + emailBody
      });
      
      json = {"status": "success", "regNumber": regNumber, "email": emailValue};
      
      
    } else { //walk-in
      
      //Mark ARRIVED automatically
      sheet.getRange(newRow, COLUMN_REG_NUMBER).setBackground(COLOR_ARRIVED);
      
      //Mark PAID
      if(form['paid']){
        sheet.getRange(newRow, COLUMN_NAME).setBackground(COLOR_PAID);
      } else {
        sheet.getRange(newRow, COLUMN_NAME).setBackground(COLOR_DEFAULT);
      }
      
      SpreadsheetApp.flush();
      
      json = {"status": "success", "regNumber": regNumber};
      
    }
    

  }catch(e){
    json = {"status": "error", "message": e.message};
  }
  
  return json;
}

/**
 * Append a single quote ( ' ) if the string is a formula, i.e., first character of the string is an equal sign ( = ).
 * @param string The string to be checked
 * @return The original string (if it is a formula, a single quote is added)
 */
function escapeFormula_(str){
  return str.charAt(0) == '=' ? "'" + str : str;
}

/**
 * Appends zero before a number.
 * @param str Number
 * @param max Expected number of digit (e.g. max=3 -> 001)
 * @return String with zero appended
 */
function appendZero_(str, max){
  str = str.toString();
  return str.length < max ? appendZero_("0" + str, max) : str;
}

/**
 * Convert a number input by user (whether it is standard or not) to a standard registration number.
 * @param rawRegNumber Number input without R (e.g. 1) or phone number (e.g. 98765432)
 * @return Standard registration number (e.g. R0001).
 */
function convertToStandardRegNumber_(rawRegNumber){

  //Remove all whitespaces
  rawRegNumber = rawRegNumber.replace(/\s+/g, '');

  //Change to upper case
  rawRegNumber = rawRegNumber.toUpperCase();
  
  //If user entered the registration number without "R", append "R" and "0"s
  if(/^\d+$/.test(rawRegNumber)){
    rawRegNumber = "R" + appendZero_(rawRegNumber, DIGIT_R);
  }
  
  return rawRegNumber;
  
}

/**
 * Convert a phone number to a standard registration number.
 * @param str Phone number
 * @return registration number
 */
function convertPhoneToRegNumber_(phoneNumber){

  //Find in both register and walk-in sheet

  var sheet1 = SpreadsheetApp.openById(SPREADSHEET_KEY).getSheetByName( SHEET_NAME_REGISTER );
  var cellPhone = findValueFromRange_(phoneNumber, sheet1.getRange(2, COLUMN_PHONE, sheet1.getLastRow()-1, 1));
  
  var cellRegNumber = null;
  
  if(cellPhone){
    
    cellRegNumber = sheet1.getRange(cellPhone.getRow(), COLUMN_REG_NUMBER);
    
  } else { //not found in register sheet, try inside walk-in sheet
    
    var sheet2 = SpreadsheetApp.openById(SPREADSHEET_KEY).getSheetByName( SHEET_NAME_WALKIN );
    cellPhone = findValueFromRange_(phoneNumber, sheet2.getRange(2, COLUMN_PHONE, sheet2.getLastRow()-1, 1));
    if(cellPhone){
      cellRegNumber = sheet2.getRange(cellPhone.getRow(), COLUMN_REG_NUMBER);
    } else {
      //not found!
      return null;
    }
    
  }
  
  //Return result
  return cellRegNumber.getValue();
  
}

/**
 * Search a registration number in a given sheet.
 * @param sheet The sheet that contains the cell that contains the number
 * @param regNumber The registration number being searched
 * @return The cell containing the number
 */
function searchRegNumber_(sheet, regNumber){
  try{
    return findValueFromRange_(regNumber, sheet.getRange(2, COLUMN_REG_NUMBER, sheet.getLastRow()-1, 1));
  } catch(e) {
    return null;
  }
}

/**
 * Finds a value within a given range. 
 * @param value The value to find.
 * @param range The range to search in.
 * @return A range pointing to the first cell containing the value, 
 *     or null if not found.
 */
function findValueFromRange_(value, range) {
  var data = range.getValues();
  for (var i = 0; i < data.length; i++) {
    for (var j = 0; j < data[i].length; j++) {
      if (data[i][j] == value) {
        return range.getCell(i + 1, j + 1);
      }
    }
  }
  return null;
}

/**

********* Last Update ********
2015-11-10
NEW:
- Add phone number search box

2015-08-13
CHANGED:
- if backend is closed, we now redirect user to front end instead of displaying message (security measure)

2015-08-10
NEW:
- Add filename on top of source code of each file
CHANGED:
- Styling (Material design)
BUG FIXED:
- server-side error cannot be displayed on client-side

*/
