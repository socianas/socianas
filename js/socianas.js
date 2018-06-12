
$(document).ready(function(){
  $('[data-toggle="tooltip"]').tooltip();
});


"use strict";
var txStatusDict = {
  0: "failed",
  1: "success",
  2: "pending"
};

var gTabId;
// nebulas TX related default variables
var gtableParams;
var gtableActivitiesParams;
var gtableProfileParams;
var gNasValue = 0;
var gNonce = 0;
var gGasPrice = "1000000";
var gGasLimit ="200000";


var nebulas = require("nebulas");
var NebPay = require("nebpay");

var nebPay = new NebPay();
var neb = new nebulas.Neb();
neb.setRequest(new nebulas.HttpRequest("https://mainnet.nebulas.io"));

var gdAppContractAddress = "n1edfmC3FtNKgLKKEVLvwi6u1oxGLLWHSXB";
var api = neb.api;
// end of nebulas TX related default variables
var gTransactionDialog;
var gNebPayIntervaltimer = 0;
var gNebPayIntervalQuery;
var gWalletAddress;
var gUserAddress = "";
var gdataImgStr = "";
var gdataSmallImgStr = "";
var duplicationSocialFormId = 1;
var gCommentDataPageNumber = "";
var gAdmin = true;
var gUseBadges = true;
var gSortedText = "CreationDate";
var mainSearchTriggered = false;

// markdown to html
var converter = new showdown.Converter({emoji: true});
converter.setFlavor('github');

// enable simplemde :
var simplemde = new SimpleMDE({
  element: document.getElementById("input-comment-id"),
  spellChecker: false
});

var simplemde_homeContent = new SimpleMDE({
  element: document.getElementById("input-home-content-id"),
  spellChecker: false
});


checkWalletExtension();
getWalletAddress();

function displayToast(textTitle, customType) {

  const toast = swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 3000
  });

  toast({
    type: customType,
    title: textTitle
  })
}




function displayCustomHtmlToast() {

  swal({
  title: 'Nebulas Wallet extension not found :\'(',
  type: 'error',
  html:
  '<h6>Usage of this App will be limited without the Nebulas wallet Extension but you will be able to browse content.</h6>' +
  '<h5>To get a full access: </h5>'+
'<b>If you are using a desktop computer:</b>' +
'<p>1. Chrome browser is required' +
'<p>2. Please check <a href="https://chrome.google.com/webstore/detail/nasextwallet/gehjkhmhclgnkkhpfamakecfgakkfkco?hl=fr&utm_source=chrome-ntp-launcher"> the official Nebulas wallet extension</a> from the Chrome Web Store </li>' +

'<p><b>If you are using a smart phone:</b><p>' +
'Please check the <a href="https://nano.nebulas.io/index_cn.html"> NAS nano Wallet App </a>',


  showCloseButton: true,
  showCancelButton: false,
  focusConfirm: false,
  confirmButtonText:
    'OK',
  confirmButtonAriaLabel: 'OK',

})
}



function checkWalletExtension () {
  //to check if the extension is installed
  //if the extension is installed, var "webExtensionWallet" will be injected in to web page
  if(typeof(webExtensionWallet) === "undefined"){

    displayCustomHtmlToast();

  }
}

function getWalletAddress () {

  window.postMessage({
    "target": "contentscript",
    "data":{},
    "method": "getAccount",
  }, "*");

  window.addEventListener('message', function(e) {
    if (gWalletAddress == null && e.data.data.account != null) {

      //$("#banner-image-id").fadeOut(1000);
      //$("#banner-image-id").fadeIn(2000);
      gWalletAddress = e.data.data.account;

      if (gUserAddress == "") {
        gUserAddress = gWalletAddress;
      }

      document.getElementById("nas-adress-id").innerHTML = gUserAddress;
    }
    else {

    }

  });

}




function getAddressForQueries() {

  if (gWalletAddress == null || gWalletAddress == "") {
    return gdAppContractAddress;
  }
  return gWalletAddress;

}



//===========================================================================//
// table search data from blockchain related :
//===========================================================================//

// get data from Blockchain :
function searchProfile() {

  var address = gdAppContractAddress;

  var searchField = "fileName";
  var func = "sm_searchProfile";
  var args = "[\"" + gUserAddress + "\"]";

  var address = gdAppContractAddress;
  var contract = {
    "function": func,
    "args": args
  };


  neb.api.call(getAddressForQueries(),gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract).then(function (resp) {

    handlesearchProfileResult(resp);

  }).catch(function (err) {
    //cbSearch(err)
    console.log("error:" + err.message);
  })

}

// format table display :
function handlesearchProfileResult(resp) {

  var jsonParseArray = JSON.parse(resp['result']);
  console.log(jsonParseArray);
}




//=======================================================================================================
//                           Transaction update management
//=======================================================================================================

function generateTransaction(callFunction, args) {

  //callback: NebPay.config.testnetUrl,
  gNebPaySerialNumber = nebPay.call(gdAppContractAddress, gNasValue, callFunction, args, {

    listener: callbackSaveFunction
  });

  nebPayCallIntervalCheckTx();
  gNebPayIntervalQuery = setInterval(function () {
    nebPayCallIntervalCheckTx();
  }, 12000);

}



//###########################################################################################################################
// TX MANAGEMENT
//###########################################################################################################################
function nebPayCallIntervalCheckTx() {

  gNebPayIntervaltimer += 1;

  // consider transaction as finished if timeout reached :
  if (gNebPayIntervaltimer > 6) {

    gNebPayIntervaltimer = 0;
    $('#tx-info-id').hide();
    clearInterval(gNebPayIntervalQuery);

  }

  else {
    nebPay.queryPayInfo(gNebPaySerialNumber).then(function (resp) {

      console.log(resp);
      var receipt = JSON.parse(resp);
      var txstatus = receipt.data.status;

      if ( receipt.code === 0 ) {
        //The transaction is successful
        console.log('transaction successful');
        //clearInterval(intervalQuery);    //stop the periodically query
      }


      if (txStatusDict[txstatus] === "pending") {

        $('#tx-info-id').show();
        console.log("Transaction status: pending");

      }
      else if (txStatusDict[txstatus] === "success") {

        console.log("Transaction status: success");
        $('#tx-info-id').hide();

        transactionFinished();
      }
      else if (txStatusDict[txstatus] === "failed") {

        console.log("Transaction status: failed");
        $('#tx-info-id').hide();
        transactionFinished();
      }

    });

  }

}

function transactionFinished() {
  clearInterval(gNebPayIntervalQuery);
  gNebPayIntervaltimer = 0;
  // reload current page after transation done :
  manageNavigation();
}

function callbackSaveFunction(hash) {

  // transaction has been cancelled by user :
  if (hash.txhash == null) {

    if ( hash.indexOf("rejected") >= 0 ) {
      $('#tx-info-id').hide();
      transactionFinished();
    }
  }

  // else transaction receipt :
  else {
    console.log("response of push: " + JSON.stringify(hash))

    api.getTransactionReceipt({hash: hash.txhash}).then(function(receipt) {
      console.log(receipt);

    });
  }
}
//###########################################################################################################################
// END OF TX MANAGEMENT
//###########################################################################################################################


function displayIconAddress() {

  var icon = blockies.create({
    seed: gUserAddress.toLowerCase(),

  });
  $('.identicon').attr('src', icon.toDataURL());
}


function manageNavigation() {

  getWalletAddress();

  console.log(gTabId);
  switch (gTabId) {

    case "v-pills-main-dashboard-tab":
    $('#card-deck-id-1').addClass('fade-out');
    $('#card-deck-id-2').addClass('fade-out');
    //fillCardDeck();
    displayStatistics();
    getLastRegisteredUsers();
    displayLoginScreen();

    break;

    case "v-pills-main-user-tab":
    displayPageContent();
    break;

    case "v-pills-home-tab":
    displayHomePage();
    break;

    case "v-pills-main-browse-tab":
    if (!mainSearchTriggered) {
      getTableBrowseResult();
    }
    mainSearchTriggered = false;
    break;


    case "v-pills-profile-tab":
    getTableFollowResult();
    break;

    case "v-pills-messages-tab":
    getTableLastPageNumber().then(function() {
      refreshTable();
    });

    break;

    case "v-pills-activities-tab":
    fillActivitiesTable();
    break;

    case "v-pills-settings-tab":

    break;

    default:


  }

}

function displayUserTab () {
  $('#v-pills-main-user-tab').tab('show');
}

function displayBrowseTab () {
  $('#v-pills-main-browse-tab').tab('show');
}


function displayAdminContentsIfNeeded() {

  gAdmin = (gWalletAddress == gUserAddress);
  if (gAdmin) {
    $("#v-pills-settings-tab").show();
    $("#fill-home-page-id").show();
  }
  else {
    $("#v-pills-settings-tab").hide();
    $("#fill-home-page-id").hide();

  }

  $('#v-pills-main-user-tab').tab('show');
  $('#v-pills-home-tab').tab('show')

}



function displayUserPage(nickName) {
  console.log(nickName);

  getUserAddressFromNickName(nickName).then(parseResult)
  .then(function (address) {

    if (address != "") {

      gUserAddress = address;
      displayAdminContentsIfNeeded();
      displayPageContent();

    }


  }).catch(function (err) {
    // TODO : something went wrong... display a message ?
    console.log("error:" + err.message)
  });
}



// Get avatar from user :
function getUserAddressFromNickName(nickName) {

  var contract = {
    "function": "sm_getAddressFromNickName",
    "args": JSON.stringify([nickName])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);
}

function parseResult(resp) {
  console.log(resp);
  return JSON.parse(resp['result']);
  //return Promise.resolve(jsonResult);
}
function parseResultArray(resp) {
  console.log(resp);
  return JSON.parse(resp);
  //return Promise.resolve(jsonResult);
}


function displayPersonnalPage() {

  gUserAddress = gWalletAddress;
  //$("#v-pills-home").show();
  displayPageContent();

}


function _showSpinnerLoginScreen () {
  document.getElementById('spinner-login-id').style.display = 'block';
  document.getElementById('main-content-login-id').style.display = 'none';
}

function _hideSpinnerLoginScreen () {
  document.getElementById('spinner-login-id').style.display = 'none';
  document.getElementById('main-content-login-id').style.display = 'block';
}


function displayLoginScreen () {

  _showSpinnerLoginScreen();
  if (!gWalletAddress) {
    setTimeout(function(){ _displayLoginScreen(); }, 1000);
  }
  else {
    _displayLoginScreen();
  }

}

function _displayLoginScreen () {
  return new Promise(function(resolve, reject) {

    getUserInfo().then(parseResult)
    .then(function (jsonResult) {

      if (jsonResult) {

        // fill again form ids :
        if (jsonResult.nickName) {
          document.getElementById("login-nickname-id").innerHTML = "Welcome back " + DOMPurify.sanitize(jsonResult.nickName) + " !";

          $("#btn-login-id").show();
          $("#btn-login-default-1-id").hide();
          $("#btn-login-default-2-id").hide();

        }

        return resolve();
      }

      else {
        document.getElementById("login-nickname-id").innerHTML = "New User ?";

        $("#btn-login-id").hide();
        $("#btn-login-default-1-id").show();
        $("#btn-login-default-2-id").show();

        return reject (Error("Whoops, user info not found :( !"));
      }

    });

  }).then(getUserAvatar).then(parseResult)
  .then(function (jsonResult) {

        if (jsonResult) {
          $('#login-avatar-id').attr('src', jsonResult);
        }

        _hideSpinnerLoginScreen();

      }).catch(function (err) {
        // TODO : something went wrong... display a message ?
        _hideSpinnerLoginScreen();
        console.log("error:" + err.message);
      });

}


function displayPageContent () {



  document.getElementById('spinner-id').style.display = 'block';
  document.getElementById('main-content-id').style.display = 'none';


  displayUserInfo().catch(function (err) {
    // TODO : something went wrong... display a message ?
    console.log("ERROR!:" + err);
    displayIconAddress();
    displayAdminContentsIfNeeded();
    document.getElementById('spinner-id').style.display = 'none';
    $("#main-content-id").fadeIn("slow");
  }).then(displayUserBanner)
  .then(displayUserAvatar)
  .then(displayUserFollowers)
  .then(displayHomePage)
  .then(getBadgeDateStatistics)
  .then(function (jsonResult) {


    console.log("End of user page loading: " + jsonResult);
    displayIconAddress();
    displayAdminContentsIfNeeded();
    document.getElementById('spinner-id').style.display = 'none';
    $("#main-content-id").fadeIn("slow");

  }).catch(function (err) {
    console.log("ERROR: " + err);
    document.getElementById('spinner-id').style.display = 'none';
    $("#main-content-id").fadeIn("slow");
  });

  document.getElementById("nas-adress-id").innerHTML = gUserAddress;

}

function displayAsynchronousBannerContent () {
  displayUserInfo().catch(function (err) {
    console.log(err);
  });
  displayUserFollowers();
  displayUserBanner();
  displayUserAvatar();
  getBadgeDateStatistics();
}



//===========================================================================================================================
// STATISTICS
//===========================================================================================================================

function displayStatistics() {
  console.log();

  return new Promise(function(resolve, reject) {
    getStatistics().then(parseResult)
    .then(function (jsonResult) {

      if (jsonResult) {

        document.getElementById('registered-user-text-id').textContent = jsonResult.registered_number;
        document.getElementById('comments-text-id').textContent = jsonResult.comments_number;



        return resolve();
      }


    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
    });

  });

}

// Get avatar from user :
function getStatistics() {

  var limit = 8;
  var contract = {
    "function": "sm_get_global_statistics",
    "args": JSON.stringify([])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}





//===========================================================================================================================
// USER INFO
//===========================================================================================================================

// Get profile content from user :
function getUserInfo() {

  var contract = {
    "function": "sm_getUserInfo",
    "args": JSON.stringify([gUserAddress])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}

function displayUserInfo() {
  console.log();

  return new Promise(function(resolve, reject) {

    getUserInfo().then(parseResult)
    .then(function (jsonResult) {


      if (jsonResult) {

        var textColor = "fff";

        document.getElementById("positive-reputation-id").innerHTML = DOMPurify.sanitize("<i class=\"fa fa-smile-o fa-lg\" ></i> <b>" + jsonResult.reputation_positive + "</b></a>");
        document.getElementById("negative-reputation-id").innerHTML = DOMPurify.sanitize("<i class=\"fa fa-frown-o fa-lg\" ></i> <b>" + jsonResult.reputation_negative + "</b></a>");


        // fill again form ids :
        if (jsonResult.nickName) {
          document.getElementById("nickname-id").innerHTML =  DOMPurify.sanitize(jsonResult.nickName);
          document.getElementById("socianas-username-id").value = DOMPurify.sanitize(jsonResult.nickName);
        }
        if (jsonResult.description) {
          document.getElementById("summary-id").innerHTML = DOMPurify.sanitize(jsonResult.description);
          document.getElementById("socianas-description-id").value = DOMPurify.sanitize(jsonResult.description);
        }
        if (jsonResult.website) {
          document.getElementById("socianas-website-id").value = DOMPurify.sanitize(jsonResult.website);

          document.getElementById("web-site-id").href = DOMPurify.sanitize(jsonResult.website);
        }

        if (jsonResult.avatar_text_color) {

          if (jsonResult.avatar_text_color != "") {
            textColor = jsonResult.avatar_text_color;

            if (!hexColorCheck(textColor)) {
              textColor = "fff";
            }
          }

          var textColor = DOMPurify.sanitize(textColor);
          document.getElementById("text-color-input-id").value = textColor;
          document.getElementById("nickname-id").style.color = "#" +  textColor;
          document.getElementById("summary-id").style.color = "#" +  textColor;

        }

        if (jsonResult.avatar_display_border) {
          if (jsonResult.avatar_display_border == "false") {
            document.getElementById("avatar-image-id").style.border = "none";
            document.getElementById("display-border-around-avatar-id").checked = false;
          }

        }

        if (jsonResult.use_badges) {

          gUseBadges = (jsonResult.use_badges === 'true');
          document.getElementById("use-notification-badges-id").checked = gUseBadges;

        }

        parseSocialNetworkLinks(jsonResult.socialNetworkLinks, textColor);

        return resolve();
      }

      else {
        console.log("Whoops, resp is undefined :(");
        return reject (Error("Whoops, user info not found :( !"));
      }


    });

  });
}








//===========================================================================================================================
// USER BANNER
//===========================================================================================================================

// Get banner from user :
function getUserBanner() {

  var contract = {
    "function": "sm_getAddressBanner",
    "args": JSON.stringify([gUserAddress])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}

function displayUserBanner() {
  console.log();

  return new Promise(function(resolve, reject) {

    getUserBanner().then(parseResult)
    .then(function (jsonResult) {

      if (jsonResult) {
        $('#banner-image-id').attr('src', jsonResult);
      }
      else {
        $('#banner-image-id').attr('src', 'img/default_header2.png');
      }
      return resolve();

    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
    });

  });

}



//===========================================================================================================================
// USER AVATAR
//===========================================================================================================================

// Get avatar from user :
function getUserAvatar() {

  var contract = {
    "function": "sm_getAddressAvatar",
    "args": JSON.stringify([gUserAddress])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}


function displayUserAvatar() {
  console.log();
  return new Promise(function(resolve, reject) {
    getUserAvatar().then(parseResult)
    .then(function (jsonResult) {

      if (jsonResult) {
        $('#avatar-image-id').attr('src', jsonResult);
      }
      else {
        $('#avatar-image-id').attr('src', 'img/default-avatar.png');
      }

      return resolve();

    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
    });

  });

}


//===========================================================================================================================
// USER FOLLOWERS
//===========================================================================================================================

// Get avatar from user :
function getUserFollowers() {

  var contract = {
    "function": "sm_get_user_follower_number",
    "args": JSON.stringify([gUserAddress])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}

function displayUserFollowers() {
  console.log();
  return new Promise(function(resolve, reject) {
    getUserFollowers().then(parseResult)
    .then(function (jsonResult) {

      var followCounter = 0;
      if (jsonResult != null) {
        followCounter = jsonResult;
      }

      document.getElementById("follow-id").innerHTML = "<i class=\"fa fa-heart fa-lg\" style=\"color:#FF69B4\"></i> <b> " + followCounter + "</b></a>";

      return resolve();

    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
    });

  });

}

//===========================================================================================================================
// USER HOME PAGE
//===========================================================================================================================

// Get avatar from user :
function getUserHomePage() {

  var contract = {
    "function": "sm_getUserHomePage",
    "args": JSON.stringify([gUserAddress])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}


function displayHomePage() {
  console.log();
  return new Promise(function(resolve, reject) {
    getUserHomePage().then(parseResult)
    .then(function (jsonResult) {

      if (jsonResult != null) {

        document.getElementById('home-page-id').innerHTML = DOMPurify.sanitize(converter.makeHtml(jsonResult));
        simplemde_homeContent.value(jsonResult);
      }



      return resolve();

    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
    });

  });

}


//===========================================================================================================================
// LAST PAGE NUMBER
//===========================================================================================================================

// Get avatar from user :
function _getTableLastPageNumber() {

  var contract = {
    "function": "sm_get_comment_number_from_address",
    "args": JSON.stringify([gUserAddress])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}

function getTableLastPageNumber () {

  return new Promise(function(resolve, reject) {

    _getTableLastPageNumber().then(parseResult).then(function (commentNumber) {

      if (commentNumber != null) {

        gCommentDataPageNumber = Math.ceil(commentNumber / gtableParams.data.limit);

        // set the boostrap table to the last page (newest messages) :
        $('#comment-table-id').bootstrapTable('refreshOptions', {
          pageNumber: gCommentDataPageNumber
        });

        console.log("PAGE_NUMBER_DONE");
        //return resolve("OK");

      }

      return resolve();

    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
    });

  });

}



function refreshTable () {

  return new Promise(function (resolve, reject) {
    $('#activities-table-id').bootstrapTable('refresh');
    $('#comment-table-id').bootstrapTable('refresh');
    console.log("REFRESH_DONE");
    return resolve("OK");
  });

}




//===========================================================================================================================
// USER USE BADGE
//===========================================================================================================================

// Get avatar from user :
function _getUserBadgeDate() {

  var contract = {
    "function": "sm_getBadgeDate",
    "args": JSON.stringify([gUserAddress])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}


function getUserBadgeDate() {
  console.log();
  return new Promise(function(resolve, reject) {
    _getUserBadgeDate().then(parseResult)
    .then(function (jsonResult) {

      if (jsonResult != null) {
        //TODO :
        console.log("TODO")
      }

      return resolve();

    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
    });

  });

}




//===========================================================================================================================
// LAST REGISTERED USERS
//===========================================================================================================================
// Get avatar from user :
function _getLastRegisteredUsers() {

  var limit = 8;
  var contract = {
    "function": "sm_get_last_registered_users",
    "args": JSON.stringify([limit])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}


function getLastRegisteredUsers() {

  _getLastRegisteredUsers().then(parseResult)
  .then(function (jsonResult) {

    if (jsonResult) {

      fillCardDeck(jsonResult);

    }


  }).catch(function (err) {
    // TODO : something went wrong... display a message ?
    console.log("error:" + err.message)
  });
  return Promise.resolve("OK");

}

function _getDefaultAvatar(avatarImg) {
  if (avatarImg == null || avatarImg == "") {
    avatarImg = "img/default-avatar.png";
  }
  return avatarImg;
}


function fillCardDeck(jsonParseArray) {

  var newcommers = "";
  var counter = 0;
  for (var i = 0; i < 8; i++) {

    var avatarImg = _getDefaultAvatar("");
    var nickName = "New User";

    if (jsonParseArray != null) {

      if (i < jsonParseArray.length) {
        avatarImg = _getDefaultAvatar(jsonParseArray[i].avatar);
        nickName = jsonParseArray[i].nickName;
      }
    }

    newcommers += `
    <div class="card card-class border-0 div-display-user-link" style="background-color: transparent;">
    <a href="#" id="user-link-id" onclick="displayUserPage('` + nickName + `')"; return false;>"
    <img class="card-img-top  card-image-class rounded-circle" src="` + avatarImg + `">
    <div class="card-body text-white text-center" style="background-color: transparent;   font-family: 'Open Sans Condensed', sans-serif, sans-serif;>
    <p class="card-text ">` + nickName + `</p>
    </div>
    </a>
    </div>`

    counter += 1;
    if (counter == 4) {
      document.getElementById('card-deck-id-1').innerHTML = newcommers;
      $('#card-deck-id-1').removeClass('fade-out');
      newcommers = "";
    }

    if (counter == 8) {
      document.getElementById('card-deck-id-2').innerHTML = newcommers;
      $('#card-deck-id-1').removeClass('fade-out');
    }

  }


}



//===========================================================================================================================
// BADGE DATE
//===========================================================================================================================
function _getBadgeDateStatistics() {

  var limit = 8;
  var contract = {
    "function": "sm_getBadgeDateStatistics",
    "args": JSON.stringify([gWalletAddress])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}


function getBadgeDateStatistics() {

  return new Promise(function(resolve, reject) {

    if (!gAdmin) {
      $( "#badge-messages-id" ).hide();
      $( "#badge-activity-id" ).hide();
      return resolve();
    }


    _getBadgeDateStatistics().then(parseResult)
    .then(function (jsonResult) {


        if (jsonResult != "") {

          console.log (jsonResult);
          document.getElementById('badge-messages-id').textContent = jsonResult.newer_messages;
          document.getElementById('badge-activity-id').textContent = jsonResult.followed_newer_messages;


          if (jsonResult.newer_messages == 0) {
            $( "#badge-messages-id" ).hide();
          }
          else {
            $( "#badge-messages-id" ).show();
          }

          if (jsonResult.followed_newer_messages == 0) {
            $( "#badge-activity-id" ).hide();
          }
          else {
            $( "#badge-activity-id" ).show();
          }

        }


      return resolve();

    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
      return reject();
    });

  });

}


//===========================================================================================================================
// FILL COMMENT TABLE
//===========================================================================================================================


// get data from Blockchain :
function fillTable(){

  var fromAddress = gdAppContractAddress;

  var limit = gtableParams.data.limit;
  //var offset = params.data.offset + 1;
  var offset = gtableParams.data.offset;

  // if search input entered is empty

  var func = "sm_get_comment_list";
  var value = [limit, offset, gUserAddress];
  var args = JSON.stringify(value);

  var contract = {
    "function": func,
    "args": args
  }

  genericSmartContractQuery(contract, fromAddress, getTableSearchResult);

}



// format table display :
function getTableSearchResult(resp) {

  var jsonParseArray = JSON.parse(resp['result']);

  var totalMessages = 0;
  for (var i = 0; i < jsonParseArray.length; i++) {
    console.log(jsonParseArray[i]);

    //jsonParseArray[i].fileName = "<a href=\"#\" id=\"tableLinkFileName\" onclick=\"downloadLink('"+ jsonParseArray[i].index +"'); return false;\">" + jsonParseArray[i].fileName + "</a>"
    if (totalMessages === 0) totalMessages = jsonParseArray[i].totalMessages;

    var smallAvatarImageId = "small-avatar-image-id-" + i;
    var timeStamp = new Date(jsonParseArray[i].date);

    var localDateStr = timeStamp.toLocaleDateString() + " - " + timeStamp.toLocaleTimeString();
    var fromNickName = jsonParseArray[i].fromNickName;
    var hrefLink = "socianas/" + jsonParseArray[i].fromAddress;


    var html = converter.makeHtml(jsonParseArray[i].message);
    var text = DOMPurify.sanitize(html);
    //this.sanitizeText(jsonParseArray[i].message)
    jsonParseArray[i].message = `<div class="container">
    <div class="card" >
    <div class="card-body">
    <div class="row">
    <div class="col-md-1 div-display-user-link" >
    <a href="#" id="user-link-id" onclick="displayUserPage('` + fromNickName + `')"; return false;>"
    <img class="img small-avatar-image-class" id="` + smallAvatarImageId + `" src="` + _getDefaultAvatar(jsonParseArray[i].fromSmallAvatar) + `"/>
    </a>
    </div>
    <div class="col-md-11">
    <a class="float-left user-comment-name-class" href="#" onclick="displayUserPage('` + fromNickName + `')"; return false;> <strong>` + fromNickName + `</strong></a>
    <span class="text-secondary float-right">` + localDateStr + `</span>

    <div class="clearfix"></div>
    <div class="user-comment-text-class">
    <p>` +  text + `</p>
    </div>
    </p>
    </div>
    </div>
    </div>`

  }

  // fill table with query results :
  gtableParams.success({
    total: totalMessages,
    rows: jsonParseArray
  });



  // resize images linked in comments :
  var imgs = document.getElementsByTagName('img');

  var imgLength = imgs.length;

  for (var i = 0; i <= imgLength-1; i++) {

    if (imgs[i].id == "") {

      var imgWidth = imgs[i].clientWidth;
      var imgHeight = imgs[i].clientHeight;


      if (imgs[i].src.includes("http")) {
        $('img').eq(i).attr({width:'200px'});
      }

    }
  }

}



//=======================================================================================================
//                           Smart contract transactions :
//=======================================================================================================


// Save profile :
function triggerLogin() {


  console.log("click");

  try {

    var callFunction = "sm_searchProfile"
    var value = "";
    var args = JSON.stringify(value);

    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });

  }

}



function _checkUSerFollowFromToAddress() {

  if (gWalletAddress == gUserAddress) {
    displayToast("Following yourself is not possible", 'info');
    return false;
  }
  return true;
}



function triggerUserFollow() {

  if (_checkUSerFollowFromToAddress()) {
  try {

    var callFunction = "sm_follow_user"
    var value = [gUserAddress];

    var args = JSON.stringify(value);
    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });
  }

}

}



function _checkUSerReputationFromToAddress() {

  if (gWalletAddress == gUserAddress) {
    displayToast("Giving feedback to yourself is not possible", 'info');
    return false;
  }
  return true;
}

function _isUSerReputationUpdateAllowed() {


  var contract = {
    "function": "sm_isUSerReputationUpdateAllowed",
    "args": JSON.stringify([gWalletAddress, gUserAddress])
  }
  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}


function triggerUserReputationGood() {
  if (_checkUSerReputationFromToAddress()) {


  _isUSerReputationUpdateAllowed().then(parseResult)
  .then(function (jsonResult) {

    if (jsonResult != "") {

      if (jsonResult == "false") {
        displayToast("Feedback can be updated only once per hour for the same user", 'info');
      }
      else {

        _triggerUserReputationGood();
      }

    }

  }).catch(function (err) {
    // TODO : something went wrong... display a message ?
    console.log("error:" + err.message)
  });
  return Promise.resolve("OK");
  }

}

function triggerUserReputationBad() {
  if (_checkUSerReputationFromToAddress()) {
  _isUSerReputationUpdateAllowed().then(parseResult)
  .then(function (jsonResult) {

    if (jsonResult != "") {

      if (jsonResult == "false") {
        displayToast("Feedback can be updated only once per hour for the same user", 'info');
      }
      else {
        _triggerUserReputationBad();
      }

    }

  }).catch(function (err) {
    // TODO : something went wrong... display a message ?
    console.log("error:" + err.message)
  });
  return Promise.resolve("OK");
}

}


function _triggerUserReputationGood() {
  _triggerUserReputation("good");
}

function _triggerUserReputationBad() {
  _triggerUserReputation("bad");
}


function _triggerUserReputation(text) {

  console.log("click");

  try {

    var callFunction = "sm_setUserReputation"
    var value = [gUserAddress, text];

    var args = JSON.stringify(value);
    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });
  }
}





function triggerUserTimeStamp() {

  console.log("click");

  try {
    var callFunction = "sm_saveBadgeDate"
    var value = [];

    var args = JSON.stringify(value);
    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });

  }

}



function aggregateSocialNetworkLinks() {

  var socialNetworkLinks = ""
  for (var i = 1; i <= duplicationSocialFormId; i++) {

    var select = document.getElementById('input-social-select-id-' + i).value;
    var url = document.getElementById("input-social-url-id-" + i).value.trim();

    if ( url !== null && url !== '' ) {
      //  console.log($( "custom-select" ).find( element ).value());
      socialNetworkLinks = socialNetworkLinks.concat(select + ";select_url;" + url + ";new_link;");
    }
  }

  return socialNetworkLinks;
}


function parseSocialNetworkLinks(socialNetworkLinks, textColor) {

  duplicationSocialFormId = 1;
  var resultList = socialNetworkLinks.split(";new_link;");
  var urlFillCounter = 0;
  $( "#social-network-list-id" ).empty();
  for (var i = 0; i < resultList.length; i++) {


    var selectUrlList = resultList[i].split(";select_url;");

    var select_number = selectUrlList[0];

    if (select_number != "") {

      var url = DOMPurify.sanitize(selectUrlList[1]);
      var select_text = "";

      if (select_number == 1) {
        li_str = "<a href=" + url + " style=\"color:#" + textColor + "\" data-toggle=\"tooltip\" title=\"Twitter contact\" ><i class=\"fa fa-twitter\"></i></a>";
      }
      if (select_number == 2) {
        li_str = "<a href=" + url + " style=\"color:#" + textColor + "\" data-toggle=\"tooltip\" title=\"Facebook contact\" ><i class=\"fa fa-facebook\"></i></a>";
      }
      if (select_number == 3) {
        li_str = "<a href=" + url + " style=\"color:#" + textColor + "\" data-toggle=\"tooltip\" title=\"Instagram contact\" ><i class=\"fa fa-instagram\"></i></a>";
      }
      if (select_number == 4) {
        li_str = "<a href=" + url + " style=\"color:#" + textColor + "\" data-toggle=\"tooltip\" title=\"Snapchat contact\" ><i class=\"fa fa-snapchat\"></i></a>";
      }
      if (select_number == 5) {
        li_str = "<a href=mailto:" + url + " style=\"color:#" + textColor + "\" data-toggle=\"tooltip\" title=\"Email contact\" ><i class=\"fa fa-envelope-o\"></i></a>";
      }

      var ul = document.getElementById("social-network-list-id");
      var li = document.createElement("li");
      var children = ul.children.length + i;
      li.setAttribute("id", "element" + children);

      li.innerHTML = DOMPurify.sanitize(li_str);
      ul.appendChild(li);

      // Form input text filling :
      if (url) {
        urlFillCounter +=1;
        $('#social-network-form-group-id-' + urlFillCounter).css('display','block');


        document.getElementById("input-social-select-id-" + urlFillCounter).value = select_number;
        document.getElementById("input-social-url-id-" + urlFillCounter).value = url;
        duplicationSocialFormId += 1;
      }

    }


    console.log(resultList[i]);

  }

  $('[data-toggle="tooltip"]').tooltip();



}




function triggerUpload() {

  console.log("click");

  try {


    var nickname = $("#socianas-username-id").val().trim();
    var description = $("#socianas-description-id").val().trim();
    var website = $("#socianas-website-id").val().trim();
    var socialNetworkLinks = aggregateSocialNetworkLinks();

    var textColor = $("#text-color-input-id").val().trim();
    if (textColor == "") {
      textColor = "fff";
    }

    var avatarDisplayBorder = document.getElementById("display-border-around-avatar-id").checked.toString();
    var useBadges = document.getElementById("use-notification-badges-id").checked.toString();
    //var avatarDisplayBorder = $("#display-border-around-avatar-id").checked.toString();
    //var useBadges = $("#use-notification-badges-id").checked.toString();


    var addField = "";
    var avatarBorderColor = "";

    var callFunction = "sm_saveUserprofile"
    var value = [nickname, website, description, socialNetworkLinks, avatarBorderColor, avatarDisplayBorder, textColor, useBadges, addField];

    //value_str = JSON.stringify(value);
    //value = "profilePrivacy;SEP;summary;SEP;description;SEP;avatarBase64";

    //var args = "[\"" + key + "\",\"" + value + "\"]";
    var args = JSON.stringify(value);
    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });

  }

}




$("#save-banner-button-id").click(function() {

  try {

    var value = [gdataImgStr];
    var callFunction = "sm_setAddressBanner"

    var args = JSON.stringify(value);
    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });
  }


});

$("#save-avatar-button-id").click(function() {

  try {

    var value = [gdataImgStr, gdataSmallImgStr];
    var callFunction = "sm_setAddressAvatar"

    var args = JSON.stringify(value);
    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });
  }


});



function uploadComment() {


  console.log("click");

  try {

    var comment = simplemde.value();
    var commentType = "markdown"

    var callFunction = "sm_save_comment"
    var value = [comment, gUserAddress, commentType];

    var args = JSON.stringify(value);
    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });

  }

}


function uploadHomePage() {


  console.log("click");

  try {

    var homeContent = simplemde_homeContent.value();

    var callFunction = "sm_saveHomePage"
    var value = [homeContent];

    var args = JSON.stringify(value);
    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });

  }

}


function saveBadgeDate() {

  console.log("click");

  try {
    var callFunction = "sm_saveBadgeDate"
    var value = [];
    var args = JSON.stringify(value);
    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });

  }

}

function unfollow(address) {

  console.log("click");

  try {
    var callFunction = "sm_unfollow_user"
    var value = [address];
    var args = JSON.stringify(value);
    generateTransaction(callFunction, args);

  } catch (e) {
    clearInterval(gNebPayIntervalQuery);
    bootbox.dialog({
      backdrop: true,
      onEscape: true,
      message: e.message,
      size: "large",
      title: "Error"
    });

  }

}



//=======================================================================================================
//                           Smart contract queries :
//=======================================================================================================

function genericSmartContractQuery(contract, fromAddress, callback) {

  neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract).then(function (resp) {

    callback(resp);

  }).catch(function (err) {
    // TODO : something went wrong... display a message ?
    console.log("error:" + err.message)
  })

}







//=======================================================================================================
// table search data from blockchain related :
//=======================================================================================================

// get table params about pagination (offset and limits) that
// are then used to query smart contract :
function ajaxRequestComments(params) {
  gtableParams = params;

  //TODO :
  if (gUserAddress) {

    fillTable();
  }
  //test();
}

function ajaxRequestActivities(params) {
  gtableActivitiesParams = params;
  //TODO :
  if (gUserAddress) {

    fillActivitiesTable();
  }
}

function ajaxRequestBrowse(params) {
  gtableParams = params;

  //TODO :

  //fillBrowseTable();
  getTableBrowseResult();
  //test();
}

function ajaxRequestFollow(params) {
  gtableProfileParams = params;
  //TODO :
  //fillBrowseTable();
  getTableFollowResult();
  //test();
}








// get data from Blockchain :
function fillActivitiesTable() {

  var fromAddress = gdAppContractAddress;

  var limitMessageNumber = 3;

  // if search input entered is empty

  var func = "sm_get_activities_list";
  var value = [gUserAddress, limitMessageNumber];
  var args = JSON.stringify(value);

  var contract = {
    "function": func,
    "args": args
  }

  genericSmartContractQuery(contract, fromAddress, getTableActivitiesResult);

}

// format table display :
function getTableActivitiesResult(resp) {

  try {
    var jsonParseArray = JSON.parse(resp['result']);

    var totalMessages = 0;
    var currentLocalDateStr = "";
    for (var i = 0; i < jsonParseArray.length; i++) {
      console.log(jsonParseArray[i]);

      //jsonParseArray[i].fileName = "<a href=\"#\" id=\"tableLinkFileName\" onclick=\"downloadLink('"+ jsonParseArray[i].index +"'); return false;\">" + jsonParseArray[i].fileName + "</a>"
      if (totalMessages === 0) totalMessages = jsonParseArray[i].totalMessages;

      var message = "";
      var smallAvatarImageId = "small-avatar-image-id-" + i;
      var timeStamp = new Date(jsonParseArray[i].date);
      var localDateStr = timeStamp.toLocaleDateString() + " - " + timeStamp.toLocaleTimeString();

      if ( currentLocalDateStr != timeStamp.toLocaleDateString() ) {

        currentLocalDateStr = timeStamp.toLocaleDateString();

        message = `<div class="container">
        <div class="card" >

        <div class="row">
        <div class="col-md-11">
        <span class="text-secondary float-right"><b>` + currentLocalDateStr + `</b></span>
        </div>
        </div>

        </div>
        </div>`

      }
      var fromNickName = jsonParseArray[i].fromNickName;
      var hrefLink = "socianas/" + jsonParseArray[i].fromAddress;

      jsonParseArray[i].message = message + `<div class="container w-75 mx-auto">
      <div class="card" >
      <div class="card-body">
      <div class="row">
      <div class="col-md-1">
      <img class="img small-avatar-image-class" id="` + smallAvatarImageId + `" src="` + _getDefaultAvatar(jsonParseArray[i].fromSmallAvatar) + `"/>
      </div>
      <div class="col-md-11">
      <a class="float-left user-comment-name-class" href="#" class="browse-user-link" onclick="displayUserPage('` + fromNickName + `')"; return false;>
      <span class="mt-2">` + fromNickName + `</span>
      </a>
      <span class="text-secondary float-right">` + localDateStr + `</span>

      <div class="clearfix"></div>
      <div class="user-comment-text-class">
      <p>` +  this.sanitizeText(jsonParseArray[i].message) + `</p>
      </div>
      </p>
      </div>
      </div>
      </div>`

    }


    // fill table with query results :
    gtableActivitiesParams.success({
      total: totalMessages,
      rows: jsonParseArray
    });
  }
  catch(e) {
    console.log(e);
    // fill table with query results :
    gtableActivitiesParams.success({
      total: 0,
      rows: 0

    });
  }
}







function checkUsernameAvailability() {

  var userName = $("#socianas-username-id").val().trim();

  if ( !/^[a-zA-Z0-9_\-.]+$/.test(userName) ) {
    $('#socianas-username-id').removeClass("is-valid").addClass("is-invalid");
    return;
    //TODO : add proper error message there
  }

  var contract = {
    "function": "sm_isNickNameAvailable",
    "args": JSON.stringify([userName, gUserAddress])
  }
  var fromAddress = gdAppContractAddress;
  genericSmartContractQuery(contract, fromAddress, getUsernameAvailabilityResult);

}

function getUsernameAvailabilityResult(resp) {

  var jsonResult = JSON.parse(resp['result']);

  if ( jsonResult === true ) {
    $('#socianas-username-id').removeClass("is-invalid").addClass("is-valid");
  }
  if ( jsonResult === false ) {
    $('#socianas-username-id').removeClass("is-valid").addClass("is-invalid");
  }
}



//=======================================================================================================
//                       EVENTS and FORMS management from user's settings tab :
//=======================================================================================================
$('#navbar-input-search-field-id').keypress(function(event){
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if(keycode == '13'){
           navbarSearchContent();
        }
    });


$('#custom-banner-file-id').change(function() {
  document.getElementById('save-banner-button-id').disabled = false;
  var check = customProfileFileCheck(this, "custom-banner-file-id", "banner-file-name-id", "banner-image-id", "save-banner-button-id");
  if (check === false) {
    document.getElementById('save-banner-button-id').disabled = true;
  }
});

$('#custom-avatar-file-id').change(function(){
  document.getElementById('save-avatar-button-id').disabled = false;
  var check = customProfileFileCheck(this, "custom-avatar-file-id", "avatar-file-name-id", "avatar-image-id", "save-avatar-button-id");

  if (check === false) {
    document.getElementById('save-avatar-button-id').disabled = true;
  }

});

$("#text-color-input-id").on("change", function(){
  var color = document.getElementById("text-color-input-id").value;
  if (color == "") {
    color = "fff";
  }
  if (! hexColorCheck(color)) {
    $('#text-color-input-id').addClass("is-invalid");
  }
  else {
    $('#text-color-input-id').removeClass("is-invalid");
  }
  document.getElementById("nickname-id").style.color = "#" +  color;
  document.getElementById("summary-id").style.color = "#" +  color;

});


$("#display-border-around-avatar-id").on("change", function(){
  var checked = document.getElementById("display-border-around-avatar-id").checked;
  if (!checked) {
    document.getElementById("avatar-image-id").style.border = "none";
  }
  else {
    document.getElementById("avatar-image-id").style.border = "3px solid #eee";
  }

});


$("#browse-date-id").on("click", function(){
gSortedText = "CreationDate";
$("#browse-date-id").removeClass("badge-secondary").addClass("badge-primary");
$("#browse-follow-id").removeClass("badge-primary").addClass("badge-secondary");
$("#browse-positive-id").removeClass("badge-primary").addClass("badge-secondary");
launchFilter();
});

$("#browse-follow-id").on("click", function(){
gSortedText = "moreFollowers";
$("#browse-follow-id").removeClass("badge-secondary").addClass("badge-primary");
$("#browse-date-id").removeClass("badge-primary").addClass("badge-secondary");
$("#browse-positive-id").removeClass("badge-primary").addClass("badge-secondary");
launchFilter();
});

$("#browse-positive-id").on("click", function(){
gSortedText = "morePositiveFeedback";
$("#browse-positive-id").removeClass("badge-secondary").addClass("badge-primary");
$("#browse-follow-id").removeClass("badge-primary").addClass("badge-secondary");
$("#browse-date-id").removeClass("badge-primary").addClass("badge-secondary");
launchFilter();
});





function launchFilter() {
  getTableBrowseResult().then(function () {
    $('#browse-table-id').bootstrapTable('refresh', {
      pageNumber: 1
    });
  });
}



$("#select-table-browser-id").on("change", function(){

  var select = document.getElementById("select-table-browser-id").value;
  console.log(select);

  gtableParams.data.offset = 0;

  // display new users
  if (select == 1) {
    gSortedText = "CreationDate";
  }
  // display more positive feedbacks
  if (select == 2) {
    gSortedText = "morePositiveFeedback";
  }
  // display more folowwers
  if (select == 3) {
    gSortedText = "moreFollowers";
  }

  getTableBrowseResult().then(function () {
    $('#browse-table-id').bootstrapTable('refresh', {
      pageNumber: 1
    });
  });


});



function hexColorCheck(hexColor) {

  return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test('#' + hexColor);

}



function customProfileFileCheck(callback, imageInputFormId, chooseFileFormId, imgId, buttonId) {

  $('#' + imageInputFormId).removeClass("is-invalid");

  readImgUrlAndPreview(callback);

  function readImgUrlAndPreview(input){

    if (input.files && input.files[0]) {

      var mimeType = input.files[0]['type'];

      try {
        if(mimeType.split('/')[0] != 'image'){
          console.log('not image');
          return false;
        }
        if (imageInputFormId == "custom-banner-file-id") {
          if (mimeType.split('/')[1] == 'gif') {
            console.log('gif');
            //return false;
          }
        }
      }
        catch(error) {
          console.error(error);
      }

      var status = this._checkFileSize(input.files[0]);

      if ( status != null ) {
        $('#' + imageInputFormId).addClass("is-invalid");
        document.getElementById(buttonId).disabled = true;
      }
      else {

        //TODO
        resizeFileForAvatarComment(input.files[0]);

        document.getElementById(chooseFileFormId).innerHTML = input.files[0].name;

        var reader = new FileReader();
        reader.onload = function (e) {
          // display image in the approriate content :
          gdataImgStr = e.target.result;
          $('#' + imgId).attr('src', e.target.result);
        }
      };
      reader.readAsDataURL(input.files[0]);

    }
  }

}


function _checkFileSizeFacility(size, name) {
  // check if size exceed 50 KiB :
  if (size > 50 * 1024) {
    var size_string = numeral(size).format('0.0 ib');
    return ("The size of <b>" + name + "</b> is <b>" + size_string + "</b>." + "<p>Please select a file that does not exceed <b>90 KiB</b>.");
  }
}

function _checkFileSize(file) {
  // check if size exceed 90 KiB :
  return _checkFileSizeFacility(file.size, file.name);
}


function addAnotherSocialLink() {

  if (duplicationSocialFormId < 5) {
    duplicationSocialFormId += 1;

    $('#social-network-form-group-id-' + duplicationSocialFormId).css('display','block');
  }

}






//=======================================================================================================
//                        Utilities :
//=======================================================================================================

function resizeFileForAvatarComment(file) {

  var reader = new FileReader();
  reader.onloadend = function() {

    var tempImg = new Image();
    tempImg.src = reader.result;

    tempImg.onload = function() {

      var MAX_WIDTH = 40;
      var MAX_HEIGHT = 40;
      var tempW = tempImg.width;
      var tempH = tempImg.height;
      if (tempW > tempH) {
        if (tempW > MAX_WIDTH) {
          tempH *= MAX_WIDTH / tempW;
          tempW = MAX_WIDTH;
        }
      } else {
        if (tempH > MAX_HEIGHT) {
          tempW *= MAX_HEIGHT / tempH;
          tempH = MAX_HEIGHT;
        }
      }

      var canvas = document.createElement('canvas');
      canvas.width = tempW;
      canvas.height = tempH;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(this, 0, 0, tempW, tempH);
      // get base64 small avatar to use it in comments section :
      gdataSmallImgStr = canvas.toDataURL("image/jpeg");

    }

  }
  reader.readAsDataURL(file);
}


function sanitizeText(text) {
  return text.replace(/\r\n|\r|\n/g, '<br />');
}



//=======================================================================================================
//                        Browse table :
//=======================================================================================================
function displayBrowseCards(jsonResult, displayUnfollow) {

  var nickName = jsonResult.nickName;
  var description = jsonResult.description;
  var avatarImg = _getDefaultAvatar(jsonResult.avatar);

  var address = jsonResult.address;

  var creationTimeStamp = new Date(jsonResult.creation_time_stamp);
  var reputationPositive = jsonResult.reputation_positive;
  var reputationNegative = jsonResult.reputation_negative;
  var numberFollowers = jsonResult.number_followers;

  var localDateStr = creationTimeStamp.toLocaleDateString();




  var icon = blockies.create({
    seed: address.toLowerCase(),

  });

  var unfollow = "";
  if (displayUnfollow === true) {
    unfollow = `<div  class="mt-5 browse-user-link">
    <button type="button" class="btn btn-warning btn-sm"  onclick="unfollow('` + address + `')"><span ><i class="fa fa-ban fa-lg" style="color:red"></i> Unfollow</span></button>
    </div>`
}



var userBlock = `<div class="row display-style container">
   <div class="col-sm">
<div class="media">
<a href="#" class="browse-user-link" onclick="displayUserPage('` + nickName + `')"; return false;>
  <img class="mr-3"  src="` + avatarImg + `" height="100" width="100">
  </a>
 <div class="media-body browse-user-link">
  <a href="#"  onclick="displayUserPage('` + nickName + `')">
    <h5 class="mt-0" style="color:black;">` + nickName + `</h5>
    <span>` + description + `</span>

   <div class="media browse-user-link" style="margin-left: -2rem; margin-top: -1em;">
     <a class="align-self-start" href="#"  onclick="displayUserPage('` + nickName + `')">
       <img class="align-self-start" src="` + icon.toDataURL() + `">
     </a>
     <div class="media-body browse-user-link">
     <a href="#" class="browse-user-link" onclick="displayUserPage('` + nickName + `')"; return false;>
        <span class="mt-2">` + address + `</span>
        </a>
     </div>
   </div>
   </a>

 </div>
</div>
</div>
<div class="col-sm">
  <ul style="list-style:none;">
<li><i class="fa fa-heart fa-lg ml-2" style="color:#FF69B4"></i> ` + numberFollowers +
`  <i class="fa fa-smile-o fa-lg ml-2" ></i> ` + reputationPositive +
`  <i class="fa fa-frown-o fa-lg ml-2" ></i> ` + reputationNegative + ` </li>
<li>` + localDateStr + `</li> ` + unfollow + `


</ul>

</div>

</div><hr>`;

return userBlock;



}




function _getRegisteredUsers() {

  var limit = gtableParams.data.limit;
  //var offset = params.data.offset + 1;
  var offset = gtableParams.data.offset;

  var contract;
  if (gSortedText != "") {
    contract = {
      "function": "sm_get_registered_users_sorted",
      "args": JSON.stringify([limit, offset, gSortedText])
    }
  }

  else {
    contract = {
      "function": "sm_get_registered_users",
      "args": JSON.stringify([limit, offset])
    }
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}

// format table display :
function getTableBrowseResult() {

  //var jsonParseArray = JSON.parse(resp['result']);

  return new Promise(function(resolve, reject) {

    _getRegisteredUsers().then(parseResult).then(function (jsonResult) {

      _displayBrowseContent(jsonResult);
      return resolve();

    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
    });
  });

}


function _displayBrowseContent(jsonResult) {

  var totalMessages = 0;
  var jsonResultArray = [];

  if (jsonResult != null && jsonResult.length > 0) {
    var jsonResultArray = []
    // FIXME :
    //var jsonResult_temp = jsonResult;
    //for (var i = 0; i < 10; i++) {
    for (var i = 0; i < jsonResult.length; i++) {
    //      user = {'users': displayBrowseCards(jsonResult[0])};
      user = {'users': displayBrowseCards(jsonResult[i])};
      jsonResultArray[i] = user;
    }

    totalMessages = jsonResult[0].total_messages;


  }


  // fill table with query results :
  // if (totalMessages == 0) {
  //   jsonResultArray = 0;
  // }
  gtableParams.success({
    total: totalMessages,
    rows: jsonResultArray
  });


}

function _displayFollowContent(jsonResult) {

  var totalMessages = 0;
  var jsonResultArray = [];

  if (jsonResult != null && jsonResult.length > 0) {
    var jsonResultArray = []
    // FIXME :
    //var jsonResult_temp = jsonResult;
    //for (var i = 0; i < 10; i++) {
    for (var i = 0; i < jsonResult.length; i++) {
      var displayUnfollow = true;
      //    user = {'users': displayBrowseCards(jsonResult[0])};
      user = {'users': displayBrowseCards(jsonResult[i], displayUnfollow)};
      jsonResultArray[i] = user;
    }

    totalMessages = jsonResult[0].total_messages;


  }

  // fill table with query results :
  // if (totalMessages == 0) {
  //   jsonResultArray = 0;
  //
  // }
  gtableProfileParams.success({
    total: totalMessages,
    rows: jsonResultArray
  });


}

//=======================================================================================================
//                        Follow table :
//=======================================================================================================
function _getTableFollowResult() {

  var limit = gtableProfileParams.data.limit;
  //var offset = params.data.offset + 1;
  var offset = gtableProfileParams.data.offset;

  var contract = {
    "function": "sm_get_followed_users",
    "args": JSON.stringify([limit, offset, gUserAddress])
  }


  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}


// format table display :
function getTableFollowResult() {

return new Promise(function(resolve, reject) {

  //var jsonParseArray = JSON.parse(resp['result']);
    _getTableFollowResult().then(parseResult).then(function (jsonResult) {

      _displayFollowContent(jsonResult);



    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
    });
});
    //gtableParams.success({
    //  total: totalMessages,
    //  rows: []
    //});

}



//=======================================================================================================
//                        Search content :
//=======================================================================================================
function _globalSearchContent(searchField) {

  var limit = gtableParams.data.limit;
  //var offset = params.data.offset + 1;
  var offset = gtableParams.data.offset;


  var contract = {
    "function": "sm_search_content",
    "args": JSON.stringify([limit, offset, searchField])
  }

  return neb.api.call(getAddressForQueries(), gdAppContractAddress, gNasValue, gNonce, gGasPrice, gGasLimit, contract);

}






function navbarSearchContent () {

  // disable table reloading when performing a search from navbar :
  mainSearchTriggered = true;

  //$('#v-pills-main-dashboard-tab').tab('show');
  $('#v-pills-main-browse-tab').tab('show');

  var searchField = document.getElementById('navbar-input-search-field-id').value;
  globalSearchContent(searchField);
}

function searchContent() {
  var searchField = document.getElementById('input-search-field-id').value;
  globalSearchContent(searchField);
}


function globalSearchContent(searchField) {

  return new Promise(function(resolve, reject) {

    _globalSearchContent(searchField).then(parseResult).then(function (jsonResult) {

      _displayBrowseContent(jsonResult);
      return resolve();

    }).catch(function (err) {
      // TODO : something went wrong... display a message ?
      console.log("error:" + err.message)
    });
  });


}
