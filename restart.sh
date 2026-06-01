#!/bin/bash
cd /home/z/my-project
echo "Reiniciando servidor 5S..."
pm2 restart 5s-app
sleep 3
pm2 status
