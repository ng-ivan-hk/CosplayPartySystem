// Settings (column & sheet starts from 0)

var GOOGLE_FORM_ID  = '1DeXFAEeVK1eosPvK4ynB5P9e_-hO4NAOBjgtAqjq1Bs';
var GOOGLE_SHEET_ID = '1eclh392VjYsIC8HaxQg8kTl_lcA4FBRI9bEamll2kbw';

var COLUMN_RESPONSE_TIME   = 0;
var COLUMN_NAME            = 1;
var COLUMN_GENDER          = 2;
var COLUMN_ROLE            = 7;
var COLUMN_PHONE           = 3;
var COLUMN_EMAIL           = 4;
var COLUMN_UID             = 5;
var COLUMN_ACA_NUM         = 6;
var COLUMN_CHARACTER       = 7;
var COLUMN_CHECK_IN_STATUS = 8;
var COLUMN_NOTE            = 9;
var COLUMN_LUGGAGE         = 10;

var LUGGAGE_MAX            = 3;

var SHEET_RESPONSE         = 0;
var SHEET_LOG              = 1;

var COLOR_LUGGAGE_OUT      = '#00ffff';
var COLOR_DEFAULT          = '#ffffff';
var APP_VERSION            = '1.0.2.3';

/*+===============================================================================
  File:      Code.gs
  
  Author:    Ivan Ng
             Information Secretary of Session 2013 - 2014
  
  Created:   17 Oct 2016
  
  Updated:   04 Dec 2017
  
  Summary:   Server-side implementation of the System.
  
  Change Log:
  --------------------------------------------------------------------------------
  Version    Date          Author     Description
  --------------------------------------------------------------------------------
  1.0.0.1    04 Nov 2016   Ivan Ng    Initial
  1.0.1.2    10 Nov 2017   Ivan Ng    - If staff didn't check-in or update luggage 
                                        before leave, display an alert
                                      - Change image and color
                                      - Add new column: character
  1.0.2.3    04 Dec 2017   Ivan Ng    - Fix: alert still on if phone not exist
                                      - Prevent switching mode when loading

----------------------------------------------------------------------------------
  This program and any source codes of it may not be reproduced or 
  distributed in any form without consent from The Animation and 
  Comics Association, HKUSU or from the author of this program.
===============================================================================+*/

function doGet(request) {
  return HtmlService.createTemplateFromFile('index').evaluate()
         .setTitle('Cosplay Party System 工作人員界面 - 香港大學學生會動漫聯盟')
         .setFaviconUrl('http://www.acabox.hkusu.hku.hk/images/favicon-200x200.png')
         .addMetaTag('viewport', 'width=device-width, initial-scale=0.5');
}

function GetParticipantInfoByPhone(strPhone)
{
  // Concat these 2 arrays later since we need to make check-in matches appears first!
  var arrMatchesCheckedIn = [];
  var arrMatchesNotCheckedIn = [];
  
  /*--------------------------------------------------------------------
  / Search through all phones in sheet
  --------------------------------------------------------------------*/
  var sheet = GetGoogleSheet_().getSheets()[SHEET_RESPONSE];
  var arr2dPhones = sheet.getRange(2, COLUMN_PHONE + 1, sheet.getLastRow() - 1, 1).getValues();
  for(var i = 0; i < arr2dPhones.length; i++)
  {
    if(arr2dPhones[i][0] == strPhone)
    {
      var jsonPartiInfo = GetParticipantInfo(i+1);
      if(jsonPartiInfo.CheckInStatus == '1')
        arrMatchesCheckedIn.push(jsonPartiInfo);
      else
        arrMatchesNotCheckedIn.push(jsonPartiInfo);
    }
  }
  
  if (arrMatchesCheckedIn.length > 0 || arrMatchesNotCheckedIn.length > 0)
    return arrMatchesCheckedIn.concat(arrMatchesNotCheckedIn);
  else
    throw "此電話號碼並未登記。";
}

function GetParticipantInfo(iRegNum)
{
  iRegNum = parseInt(iRegNum); //make sure it's an integer
  
  /*--------------------------------------------------------------------
  / Prepare values from row (that stores this parti's data)
  --------------------------------------------------------------------*/
  var sheet = GetGoogleSheet_().getSheets()[SHEET_RESPONSE];
  var iCellRowNum = iRegNum + 1;
  if(iRegNum < 1 || iCellRowNum > sheet.getLastRow())
  {
    throw "無法找到登記編號。";
  }
  var arrValues = sheet.getRange(iCellRowNum, 1, 1, COLUMN_LUGGAGE + LUGGAGE_MAX).getValues()[0];

  /*--------------------------------------------------------------------
  / Push luggage info to an array
  --------------------------------------------------------------------*/
  var arrLuggages = [];
  var arrStrBackgrounds = sheet.getRange(iCellRowNum, COLUMN_LUGGAGE + 1, 1, LUGGAGE_MAX).getBackgrounds()[0];
  
  for(var i = 0; i < LUGGAGE_MAX; i++)
  {
    var strLugNum = arrValues[COLUMN_LUGGAGE + i];
    var bOut = arrStrBackgrounds[i] == COLOR_LUGGAGE_OUT ? 1: 0;
    arrLuggages.push( { "LugNum" : strLugNum , "Out" : bOut } );
  }

  /*--------------------------------------------------------------------
  / Get basic info from sheet and group information into JSON
  --------------------------------------------------------------------*/
  var dateResponseTime = arrValues[COLUMN_RESPONSE_TIME];
  
  var jsonPartiInfo = 
      {
        "Status"        : "OK",
        "RegNum"        : iRegNum,
        "Name"          : arrValues[COLUMN_NAME],
        "Gender"        : arrValues[COLUMN_GENDER],
        "Phone"         : arrValues[COLUMN_PHONE],
        "Email"         : arrValues[COLUMN_EMAIL],
        "UID"           : arrValues[COLUMN_UID],
        "ACANum"        : arrValues[COLUMN_ACA_NUM],
        "Role"          : arrValues[COLUMN_ROLE],
        "Character"     : arrValues[COLUMN_CHARACTER],
        "ResponseTime"  : dateResponseTime.toLocaleDateString() + dateResponseTime.toLocaleTimeString(),
        "CheckInStatus" : arrValues[COLUMN_CHECK_IN_STATUS] == '1'? 1 : 0,
        "Note"          : arrValues[COLUMN_NOTE],
        "Luggages"      : arrLuggages
      };
  
  return jsonPartiInfo;
  
}

function CheckIn(iRegNum)
{
  iRegNum = parseInt(iRegNum); //make sure it's an integer
  /*--------------------------------------------------------------------
  / Get check-in status from sheet
  --------------------------------------------------------------------*/
  var bNewCheckinStatus;
  
  var sheet = GetGoogleSheet_().getSheets()[SHEET_RESPONSE];
  var iCellRowNum = iRegNum + 1;
  if(iRegNum < 1 || iCellRowNum > sheet.getLastRow())
  {
    throw "無法找到登記編號。";
  }
  var rangeCheckInStatus = sheet.getRange(iCellRowNum, COLUMN_CHECK_IN_STATUS + 1);
  if(rangeCheckInStatus.getValue() == '1')
  {
    bNewCheckinStatus = 0;
  }
  else
  {
    bNewCheckinStatus = 1;
  }
  
  /*--------------------------------------------------------------------
  / Update check-in status to sheet
  --------------------------------------------------------------------*/
  rangeCheckInStatus.setValue(bNewCheckinStatus);
  SpreadsheetApp.flush();
  WriteLog_("Reg Num " + iRegNum  + (bNewCheckinStatus ? " checked-in" : " cancelled check-in"));
  
  return GetParticipantInfo(iRegNum); //return updated info
  
}

function UpdateLuggages(iRegNum, arrLuggages)
{
  Logger.log(iRegNum + "/" + arrLuggages);
  iRegNum = parseInt(iRegNum); //make sure it's an integer
  /*--------------------------------------------------------------------
  / Validate request
  --------------------------------------------------------------------*/
  if(arrLuggages.length > LUGGAGE_MAX)
  {
    throw "輸入過多行李。";
  }
  
  /*--------------------------------------------------------------------
  / Get check-in status
  --------------------------------------------------------------------*/ 
  var iCellRowNum = iRegNum + 1;
  var sheet = GetGoogleSheet_().getSheets()[SHEET_RESPONSE];
  var rangeCheckInStatus = sheet.getRange(iCellRowNum, COLUMN_CHECK_IN_STATUS + 1);
  if(rangeCheckInStatus.getValue() != '1')
  {
    throw "這位參加者尚未登記。請先前往登記室登記。"
  }
  
  /*--------------------------------------------------------------------
  / Update luggage info
  --------------------------------------------------------------------*/  
  var objArrData = { Values: [], NumberFormats: [], Backgrounds: [] };
  for(var i = 0; i < arrLuggages.length; i++)
  {
    var strLugNum = arrLuggages[i].LugNum;
    if(strLugNum.charAt(0) == '=')
      strLugNum = "'" + strLugNum; //escape equal sign
      
    objArrData.Values.push(strLugNum);
    objArrData.NumberFormats.push('@STRING@');
    objArrData.Backgrounds.push(arrLuggages[i].Out == '1' ? COLOR_LUGGAGE_OUT : COLOR_DEFAULT);
  }
  
  var rangeLuggages = sheet.getRange(iCellRowNum, COLUMN_LUGGAGE + 1, 1, LUGGAGE_MAX)
  rangeLuggages.setValues([objArrData.Values]);
  rangeLuggages.setNumberFormats([objArrData.NumberFormats]);
  rangeLuggages.setBackgrounds([objArrData.Backgrounds]);

  
  SpreadsheetApp.flush();
  WriteLog_("Reg Num " + iRegNum  + " updated luggages: " + JSON.stringify(arrLuggages));
  
  return GetParticipantInfo(iRegNum); //return updated info
}

/*####################################################################
# Private functions
####################################################################*/
var googleFormObj  = null;
var googleSheetObj = null;

function GetGoogleForm_()
{
  if(googleFormObj)
    return googleFormObj;
  else
  {
    googleFormObj = FormApp.openById(GOOGLE_FORM_ID);
    return googleFormObj;
  }
}

function GetGoogleSheet_()
{
  if(googleSheetObj)
    return googleSheetObj;
  else
  {
    googleSheetObj = SpreadsheetApp.openById(GOOGLE_SHEET_ID);
    return googleSheetObj;
  }
}

function WriteLog_(strLog)
{
  var googleSheet = GetGoogleSheet_();
  var sheets = googleSheet.getSheets();
  if(sheets.length == 1) 
    googleSheet.insertSheet('Log').appendRow([new Date(), strLog]);
  else
    sheets[SHEET_LOG].appendRow([new Date(), strLog]);
}
