#!/bin/bash
# =====================================================
#  FACT ROYALE — One-Time GitHub Setup Script
#  Run this once from inside the fact-royale folder
# =====================================================

echo ""
echo "♛  FACT ROYALE — GitHub Setup"
echo "======================================"
echo ""

# Step 1: Initialize git
echo "→ Initializing git repository..."
git init
git add .
git commit -m "Initial build: Fact Royale MVP"
echo "✓ Local repo ready."
echo ""

# Step 2: Prompt for GitHub username
echo "--------------------------------------"
echo "NEXT: You need to create the GitHub repo."
echo ""
echo "  1. Go to: https://github.com/new"
echo "  2. Repository name: fact-royale"
echo "  3. Set to: Public"
echo "  4. Do NOT check any of the 'Initialize' boxes"
echo "  5. Click 'Create repository'"
echo ""
read -p "Once you've created the repo, enter your GitHub username: " USERNAME
echo ""

# Step 3: Set remote and push
echo "→ Connecting to GitHub..."
git remote add origin https://github.com/$USERNAME/fact-royale.git
git branch -M main
git push -u origin main

echo ""
echo "======================================"
echo "✓ Done! Your site is being deployed."
echo ""
echo "Enable GitHub Pages:"
echo "  1. Go to: https://github.com/$USERNAME/fact-royale/settings/pages"
echo "  2. Under 'Source' → select 'Deploy from a branch'"
echo "  3. Branch: main  |  Folder: / (root)"
echo "  4. Click Save"
echo ""
echo "Your live URL will be:"
echo "  https://$USERNAME.github.io/fact-royale/"
echo ""
echo "It takes 1-2 minutes to go live after saving."
echo "======================================"
