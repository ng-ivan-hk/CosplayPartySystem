// Settings
var COLUMN_CHECK_IN_STATUS = 9;
var COLUMN_NOTE            = 10;
var COLUMN_LUGGAGE         = 11;
var LUGGAGE_MAX            = 3;
var COLOR_LUGGAGE_OUT      = '#00ffff';
var COLOR_DEFAULT          = '#ffffff';
var APP_VERSION            = '1.0.0.0';

/*+===================================================================
  File:      Code.gs
  
  Author:    Ivan Ng
             Information Secretary of Session 2013 - 2014
  
  Created:   17 Oct 2016
  
  Updated:   22 Oct 2016
  
  Summary:   Server-side implementation of the System.
  
  Change Log:
  ----------------------------------------------------------------------
  Version    Date           Author      Description
  ----------------------------------------------------------------------
  1.0.0.0    ?? Oct 2016    Ivan Ng     Initial
  
  TODO:
  
  Send email on form submit
  install?
  set all cells to plain text
  log

----------------------------------------------------------------------
  This program and any source codes of it may not be reproduced or 
  distributed in any form without consent from The Animation and 
  Comics Association, HKUSU or from the author of this program.
===================================================================+*/

function doGet(request) {
  return HtmlService.createTemplateFromFile('index').evaluate();
}

function GetParticipantInfoByPhone(strPhone)
{
  // Concat these 2 arrays later since we need to make check-in matches appears first!
  var arrMatchesCheckedIn = [];
  var arrMatchesNotCheckedIn = [];
  /*--------------------------------------------------------------------
  / Search in form responses
  --------------------------------------------------------------------*/
  var formResponses = FormApp.openById(GetGoogleFormID_()).getResponses();
  for(var i = 0; i < formResponses.length; i++)
  {
    var itemResponses = formResponses[i].getItemResponses();
    Logger.log("[%s] [%s]", itemResponses[2].getResponse(), strPhone);
    if(itemResponses[2].getResponse() == strPhone)
    {
      var jsonPartiInfo = GetParticipantInfo(i+1);
      if(jsonPartiInfo.CheckInStatus == '1')
        arrMatchesCheckedIn.push(jsonPartiInfo);
      else
        arrMatchesNotCheckedIn.push(jsonPartiInfo);
    }
  }
  
  return arrMatchesCheckedIn.concat(arrMatchesNotCheckedIn);
}

function GetParticipantInfo(iRegNum)
{
  iRegNum = parseInt(iRegNum); //make sure it's an integer
  
  /*--------------------------------------------------------------------
  / Get basic info from form responses
  --------------------------------------------------------------------*/
  var formResponses = FormApp.openById(GetGoogleFormID_()).getResponses();
  if(iRegNum < 1 || iRegNum > formResponses.length)
  {
    throw "無法找到登記編號。";
  }
  
  var itemResponses = formResponses[iRegNum - 1].getItemResponses();
  var dateResponseTime = formResponses[iRegNum - 1].getTimestamp();
  var strResponseTime = 
    dateResponseTime ? 
    dateResponseTime.toLocaleDateString() + dateResponseTime.toLocaleTimeString() : '---';
  
  /*--------------------------------------------------------------------
  / Get check-in status from sheet
  --------------------------------------------------------------------*/
  var bCheckInStatus;
  
  var iCellRowNum = iRegNum + 1;
  var sheet = SpreadsheetApp.openById(GetGoogleSheetID_()).getSheets()[0];
  var rangeCheckInStatus = sheet.getRange(iCellRowNum, COLUMN_CHECK_IN_STATUS);
  if(rangeCheckInStatus.getValue() == '1')
  {
    bCheckInStatus = 1;
  }
  else
  {
    bCheckInStatus = 0;
  }
  
  /*--------------------------------------------------------------------
  / Get note from sheet
  --------------------------------------------------------------------*/
  var strNote = sheet.getRange(iCellRowNum, COLUMN_NOTE).getValue();

  /*--------------------------------------------------------------------
  / Get luggage info from sheet
  --------------------------------------------------------------------*/
  var arrLuggages = [];
  
  for(var i = 0; i < LUGGAGE_MAX; i++)
  {
    var rangeLugNum = sheet.getRange(iCellRowNum, COLUMN_LUGGAGE + i);
    var strLugNum = rangeLugNum.getValue();
    var bOut = rangeLugNum.getBackground() == COLOR_LUGGAGE_OUT ? 1: 0;
    arrLuggages.push( { "LugNum" : strLugNum , "Out" : bOut } );
  }

  /*--------------------------------------------------------------------
  / Group information into JSON
  --------------------------------------------------------------------*/
  var jsonPartiInfo = 
      {
        "Status"        : "OK",
        "RegNum"        : iRegNum,
        "Name"          : itemResponses[0].getResponse(),
        "Gender"        : itemResponses[1].getResponse(),
        "Phone"         : itemResponses[2].getResponse(),
        "Email"         : itemResponses[3].getResponse(),
        "UID"           : itemResponses[4].getResponse(),
        "ACANum"        : itemResponses[5].getResponse(),
        "Role"          : itemResponses[6].getResponse(),
        "ResponseTime"  : strResponseTime,
        "CheckInStatus" : bCheckInStatus,
        "Note"          : strNote,
        "Luggages"      : arrLuggages
      };
  
  return jsonPartiInfo;
  
}

function CheckIn(iRegNum, strNote)
{
  iRegNum = parseInt(iRegNum); //make sure it's an integer
  /*--------------------------------------------------------------------
  / Get check-in status from sheet
  --------------------------------------------------------------------*/
  var bNewCheckinStatus;
  
  var sheet = SpreadsheetApp.openById(GetGoogleSheetID_()).getSheets()[0];
  var iCellRowNum = iRegNum + 1;
  if(iRegNum < 1 || iCellRowNum > sheet.getLastRow())
  {
    throw "無法找到登記編號。";
  }
  var rangeCheckInStatus = sheet.getRange(iCellRowNum, COLUMN_CHECK_IN_STATUS);
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
  
  /*--------------------------------------------------------------------
  / Update note
  --------------------------------------------------------------------*/
  var rangeNote = sheet.getRange(iCellRowNum, COLUMN_NOTE);
  rangeNote.setValue(strNote);
  
  SpreadsheetApp.flush();
  
  return GetParticipantInfo(iRegNum); //return updated info
  
}

function UpdateLuggages(iRegNum, arrLuggages, strNote)
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
  var sheet = SpreadsheetApp.openById(GetGoogleSheetID_()).getSheets()[0];
  var rangeCheckInStatus = sheet.getRange(iCellRowNum, COLUMN_CHECK_IN_STATUS);
  if(rangeCheckInStatus.getValue() != '1')
  {
    throw "這位參加者尚未登記。請先前往登記室登記。"
  }
  
  /*--------------------------------------------------------------------
  / Update luggage info
  --------------------------------------------------------------------*/
  for(var i = 0; i < arrLuggages.length; i++)
  {
    var rangeLugNum = sheet.getRange(iCellRowNum, COLUMN_LUGGAGE + i);
    rangeLugNum.setValue(arrLuggages[i].LugNum);
    
    if(arrLuggages[i].Out == '1')
    {
      rangeLugNum.setBackground(COLOR_LUGGAGE_OUT);
    }
    else if (arrLuggages[i].Out == '0')
    {
      rangeLugNum.setBackground(COLOR_DEFAULT);
    }
  }
  
  /*--------------------------------------------------------------------
  / Update note
  --------------------------------------------------------------------*/
  var rangeNote = sheet.getRange(iCellRowNum, COLUMN_NOTE);
  rangeNote.setValue(strNote);
  
  SpreadsheetApp.flush();
  
  return GetParticipantInfo(iRegNum); //return updated info
}

function PrintAllResponsesFromForm() {
  
  var strResponses = "";
  
  // Open a form by ID and log the responses to each question.
  var form = FormApp.openById(GetGoogleFormID_());
  var formResponses = form.getResponses();
  for (var i = 0; i < formResponses.length; i++) {
    var formResponse = formResponses[i];
    var itemResponses = formResponse.getItemResponses();
    for (var j = 0; j < itemResponses.length; j++) {
      var itemResponse = itemResponses[j];
      Logger.log('Response #%s to the question "%s" was "%s"',
                 (i + 1).toString(),
                 itemResponse.getItem().getTitle(),
                 itemResponse.getResponse());
      
      strResponses += Utilities.formatString('Response #%s to the question "%s" was "%s" <br>', 
                                             (i + 1).toString(),
                                             itemResponse.getItem().getTitle(),
                                             itemResponse.getResponse());
    }
  }
  
  return strResponses;
}

function Test()
{
  var arrLug = 
      [
        {"LugNum" : "A5", "Out" : "1"},
        {"LugNum" : "A6", "Out" : "0"},
        {"LugNum" : "A4", "Out" : "1"}
      ];
  CheckIn(2, "Hey");
  var j = UpdateLuggages(2, arrLug, "Test");
        
  return JSON.stringify(j);
  
}

/*####################################################################
# Private functions
####################################################################*/

function GetGoogleFormID_()
{
  //TODO: use property
  return '1DeXFAEeVK1eosPvK4ynB5P9e_-hO4NAOBjgtAqjq1Bs';
}

function GetGoogleSheetID_()
{
  //TODO: use property
  return '1eclh392VjYsIC8HaxQg8kTl_lcA4FBRI9bEamll2kbw';
}
