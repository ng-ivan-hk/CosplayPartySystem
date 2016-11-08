// Google Sheet colum number (Column A is 0, B is 1,...)
var ITEM_NAME  = 1;
var ITEM_EMAIL = 4; 

/*+===================================================================
  File:      AutoSendEmail.gs
  
  Author:    Ivan Ng
             Information Secretary of Session 2013 - 2014
  
  Created:   24 Oct 2016
  
  Updated:   25 Oct 2016
  
  Summary:   Implementation of Auto Send Email function on form submit.
             Part of Cosplay Party System 2016.
             
             This code should be placed inside the Google Sheet which
             receives response from a Google Form. In the Google Sheet,
             click "Tools" -> "ScriptEditor", and copy this code to
             the Google Apps Script project opened for you.
             Remember to set the trigger as "on form submit".
             
             You should only edit this code when:
             1. you need to change the email content
             2. you need to change the excel column number
             3. YOU REALLY KNOW WHAT YOU ARE DOING
  
  
  Change Log:
  ----------------------------------------------------------------------
  Version    Date           Author      Description
  ----------------------------------------------------------------------
  1.0.0.0    25 Oct 2016    Ivan Ng     Initial

----------------------------------------------------------------------
  This program and any source codes of it may not be reproduced or 
  distributed in any form without consent from The Animation and 
  Comics Association, HKUSU or from the author of this program.
===================================================================+*/

function SendEmailToParticipant(e)
{
  if(!e)
    return;

  // Data needed to be include in the email
  var iResponseIndex = -1;
  var strPartiName = "";
  var strPartiEmail = "";

  /*--------------------------------------------------------------------
  / Get these data!
  --------------------------------------------------------------------*/
  iResponseIndex = e.range.getRow() - 1;
  var values = e.range.getValues();
  Logger.log(values);
  strPartiName = values[0][ITEM_NAME];
  strPartiEmail = values[0][ITEM_EMAIL];
 
  /*--------------------------------------------------------------------
  / Let's send email!
  --------------------------------------------------------------------*/
  
  // Prepare email content (in HTML)
   var blobBanner = UrlFetchApp
                          .fetch("https://i.imgur.com/ryV2utc.jpg")
                          .getBlob()
                          .setName("blobBanner");

  
  var strSenderName = "香港大學學生會動漫聯盟";
  var strSubject    = "HKU Cosplay Party 2016 及 同人祭《霜月式 • 楓咲》確認電郵";
  var strEmailBody  = 
  
    '<p><img src="cid:banner" /></p>'
  
    + '<p>致' + strPartiName + '：</p>'
    
    + '<p>　　你好！本會已收到 閣下對2016年度港大同人祭《霜月式 • 楓咲》及cosplay party之cosplayer及攝影師網上預先登記之申請。 閣下之申請編號為：<span style="color:red;font-weight:bold;">' + iResponseIndex + '</span>。由於在活動當日登記及使用行李寄存服務時皆需出示此登記編號作為確認身份之用，謹請 閣下妥善保存此編號。在當日登記時，本會之工作人員需要 閣下之身份證明文件作為核對資料之用，因此也請 閣下於活動當天帶備有效的身份證明文件（如身份證、學生證）。</p>'
    
    + '<p>　　以下為活動當天的參加者守則，在此，本會衷心感謝 閣下對此次活動的支持。<br>（cpdjs網link）</p>'
    
    + '<p>　　如有任何問題，歡迎致電/whatsapp活動負責人Whitney (5111 9727)，或inbox本次活動之Facebook專頁 （ https://facebook.com/hkucosplayparty/ ）進行查詢。</p>'
    
    + '<p>香港大學學生會動漫聯盟</p>';
    
  
  //Send out email!
  MailApp.sendEmail({
    name:     strSenderName,
    to:       strPartiEmail,
    subject:  strSubject,
    htmlBody: '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n' + strEmailBody,
    inlineImages:
    {
      banner: blobBanner
    }
  });
  
  Logger.log("Remaining email quota: " + MailApp.getRemainingDailyQuota());
  
}
