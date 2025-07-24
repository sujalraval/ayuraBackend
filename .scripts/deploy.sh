set -e

echo "Adding execute permissions to deployment script..."
chmod +x ./.scripts/deploy.sh

echo "Deployment started..."

# Pull the latest version of the app
git pull origin main
echo "New changes copied to server !"

echo "Installing Dependencies..."
npm install --yes

echo "Deployment Finished!"