#!/bin/bash
function coloredEcho(){
  local exp=$1;
  local color=$2;
  if ! [[ $color =~ '^[0-9]$' ]] ; then
   case $(echo $color | tr '[:upper:]' '[:lower:]') in
    black) color=0 ;;
red) color=1 ;;
green) color=2 ;;
yellow) color=3 ;;
blue) color=4 ;;
magenta) color=5 ;;
cyan) color=6 ;;
        white|*) color=7 ;; # white or invalid color
esac
fi
tput setaf $color;
echo $exp;
tput sgr0;
}

echo "============================================================="
echo "  Running CURL tests for deprecated routes "
echo "============================================================="


TESTCOUNT=0;
TESTFAILED=0;
TESTSFAILEDSTRING="$TESTSFAILEDSTRING : $TESTNAME"
echo "$TESTSFAILEDSTRING $result " >> test_errors.log
TESTPASSED=0;
TESTCOUNTEXPECTED=32;
echo "" > test_errors.log

# Production server is using http behind nginx
SERVER="https://localhost:3183";
if [ "$NODE_ENV" == "production" ]; then
  SERVER="http://localhost:3183";
fi
# SERVER="https://auth.lingsync.org";

echo ""
echo "Using $SERVER"


echo "-------------------------------------------------------------"
TESTNAME="It should return (upgraded) user details upon successful login"
echo "$TESTNAME"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testingprototype", "password": "test"}' \
$SERVER/login `"
echo ""
echo "Response: $result" | grep -C 4 prefs;
if [[ $result =~ userFriendlyErrors ]]
  then {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : $TESTNAME"
   echo "$TESTSFAILEDSTRING $result should not have userFriendlyErrors " >> test_errors.log
 }
fi
if [[ $result =~ "\"prefs\":" ]]
  then {
    echo "Details recieved, you can use this user object in your app settings for this user."
    echo "   success";

    # echo "Response: $result";
    echo "  $result" | grep -C 4 "corpuses";
    echo "  $result" | grep -C 4 "corpora";
    if [[ $result =~ "\"corpuses\":" ]]
      then {
       TESTFAILED=$[TESTFAILED + 1]
       TESTSFAILEDSTRING="$TESTSFAILEDSTRING : $TESTNAME"
       echo "$TESTSFAILEDSTRING Should not have corpuses: $result " >> test_errors.log
      } else  {
        echo "Upgraded users corpuses to corpora."
        echo "   success";
     }
    fi
  } else  {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : $TESTNAME"
   echo "$TESTSFAILEDSTRING $result should have prefs " >> test_errors.log
 }
fi


echo "-------------------------------------------------------------"
TESTNAME="It should count down the password reset"
echo "$TESTNAME"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testingprototype", "password": "test"}' \
$SERVER/login `"
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testingprototype", "password": "opps"}' \
$SERVER/login `"
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testingprototype", "password": "wrongpassword"}' \
$SERVER/login `"
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testingprototype", "password": "again"}' \
$SERVER/login `"
echo "$result"
if [[ $result =~ "You have 2 more attempts"  ]]
  then {
    echo "   success 2 more attempts";
  } else {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : $TESTNAME"
   echo "$TESTSFAILEDSTRING $result " >> test_errors.log
 }
fi
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testingprototype", "password": "trying"}' \
$SERVER/login `"
# echo "$result"
if [[ $result =~ "You have 1 more attempts"  ]]
  then {
    echo "   success 1 more attempt";
  } else {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : $TESTNAME"
   echo "$TESTSFAILEDSTRING $result " >> test_errors.log
 }
fi
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testingprototype", "password": "wrongpassword"}' \
$SERVER/login `"
echo "$result"
if [[ $result =~ "You have tried to log in"  ]]
  then {
    echo "   success warn user who have no email ";
  } else {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : $TESTNAME"
   echo "$TESTSFAILEDSTRING $result " >> test_errors.log
 }
fi

echo "-------------------------------------------------------------"
TESTNAME="It should accept forgotpassword (and fail on the last step if on a dev server since it has no credentials to send emails)"
echo "$TESTNAME"
echo " prep: try to login with wrong password"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testinguserwithemail", "password": "opps"}' \
$SERVER/login `"
echo ""
# echo "Response: $result";
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"email": "myemail@example.com"}' \
$SERVER/forgotpassword `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
  echo "   success"
  if [[ $result =~ "Please report this 2823"  ]]
   then {
     echo "   server provided an informative message";
   } else {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : $TESTNAME"
    echo "$TESTSFAILEDSTRING $result " >> test_errors.log
  }
fi
} else {
  TESTFAILED=$[TESTFAILED + 1]
  TESTSFAILEDSTRING="$TESTSFAILEDSTRING : $TESTNAME"
  echo "$TESTSFAILEDSTRING $result " >> test_errors.log
}
fi



echo;
echo;
echo "============================================================="
echo "Test results for deprecated routes";

TESTPASSED=$((TESTCOUNT-TESTFAILED));
if [ $TESTPASSED = $TESTCOUNT ]; then
 coloredEcho  "   $TESTPASSED passed of $TESTCOUNT" green
else
  coloredEcho  "   $TESTPASSED passed of $TESTCOUNT" red
  coloredEcho  "    $TESTFAILED failed" red
  coloredEcho "    $TESTSFAILEDSTRING" red
fi

if [ $TESTCOUNT = $TESTCOUNTEXPECTED ]; then
 coloredEcho  "   Ran $TESTCOUNT of $TESTCOUNTEXPECTED expected" green
else
  coloredEcho  "   Ran $TESTCOUNT of $TESTCOUNTEXPECTED expected" yellow
fi

echo "============================================================="

cat test_errors.log
if [ $TESTPASSED -eq $TESTCOUNT ]
  then
  exit $TESTFAILED;
else
  exit $TESTFAILED;
fi
# ls noqata_tusunayawami.mp3 || {
# 	result="`curl -O --retry 999 --retry-max-time 0 -C - https://github.com/FieldDB/FieldDB/blob/master/sample_data/noqata_tusunayawami.mp3?raw=true
# 	mv "noqata_tusunayawami.mp3?raw=true" noqata_tusunayawami.mp3
# }

# 15602
