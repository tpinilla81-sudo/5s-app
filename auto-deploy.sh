#!/bin/bash
# Auto-deploy script for 5s-app
# This script deploys the Next.js app to Vercel
# It requires either a Vercel API token or a GitHub token

set -e

echo "=== 5s-app Auto-Deploy Script ==="
echo ""

# Check for Vercel token in auth.json
VERCEL_AUTH="/home/z/.local/share/com.vercel.cli/auth.json"
if [ -f "$VERCEL_AUTH" ]; then
  TOKEN=$(python3 -c "import json; print(json.load(open('$VERCEL_AUTH')).get('token',''))" 2>/dev/null)
  if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
    echo "Found Vercel token in auth.json"
    echo "Attempting deployment with Vercel CLI..."
    cd /home/z/my-project && npx vercel deploy --prod --yes
    exit $?
  fi
fi

# Check for GitHub token
GH_TOKEN_FILE="/tmp/gh_token.json"
if [ -f "$GH_TOKEN_FILE" ]; then
  GH_TOKEN=$(python3 -c "import json; print(json.load(open('$GH_TOKEN_FILE')).get('access_token',''))" 2>/dev/null)
  if [ -n "$GH_TOKEN" ] && [ "$GH_TOKEN" != "" ]; then
    echo "Found GitHub token"
    echo "Pushing to GitHub (will trigger Vercel auto-deploy)..."
    cd /home/z/my-project
    git remote set-url origin "https://tpinilla81-sudo:${GH_TOKEN}@github.com/tpinilla81-sudo/5s-app.git"
    git push origin main
    echo "Push complete! Vercel should auto-deploy from GitHub."
    exit $?
  fi
fi

# Check for VERCEL_TOKEN env var
if [ -n "$VERCEL_TOKEN" ]; then
  echo "Found VERCEL_TOKEN env var"
  cd /home/z/my-project && npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
  exit $?
fi

# Check for GITHUB_TOKEN env var
if [ -n "$GITHUB_TOKEN" ]; then
  echo "Found GITHUB_TOKEN env var"
  cd /home/z/my-project
  git remote set-url origin "https://tpinilla81-sudo:${GITHUB_TOKEN}@github.com/tpinilla81-sudo/5s-app.git"
  git push origin main
  echo "Push complete! Vercel should auto-deploy from GitHub."
  exit $?
fi

echo "No authentication tokens found!"
echo ""
echo "To deploy, you need to authorize one of the following:"
echo ""
echo "Option 1: Vercel Device Flow"
echo "  Visit: https://vercel.com/oauth/device?user_code=XQPR-TQLL"
echo "  (Log in to your Vercel account and authorize)"
echo ""
echo "Option 2: GitHub Device Flow"  
echo "  Visit: https://github.com/login/device"
echo "  Enter code: 4A62-02C5"
echo "  (This will push code to GitHub, triggering Vercel auto-deploy)"
echo ""
echo "Option 3: Set environment variables"
echo "  export VERCEL_TOKEN=your_vercel_api_token"
echo "  export GITHUB_TOKEN=your_github_token"
echo "  Then re-run this script."
echo ""
echo "After authorizing, run: bash /home/z/my-project/auto-deploy.sh"
