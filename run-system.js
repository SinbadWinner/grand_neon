const { execSync } = require('child_process');
const { spawn } = require('child_process');

async function runSystem() {
    console.log("🚀 === ЗАПУСК ПОЛНОЙ DEFI СИСТЕМЫ ===\n");
    
    try {
        console.log("📋 === ИНСТРУКЦИИ ===");
        console.log("1. Откройте НОВЫЙ терминал");
        console.log("2. Перейдите в папку проекта: cd D:\\grand_project");
        console.log("3. Запустите Hardhat node: npx hardhat node");
        console.log("4. Оставьте этот терминал открытым");
        console.log("5. Вернитесь в этот терминал и нажмите Enter");
        
        // Wait for user input
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        await new Promise(resolve => {
            rl.question("\nНажмите Enter когда Hardhat node будет запущен...", () => {
                rl.close();
                resolve();
            });
        });
        
        console.log("\n🔧 === РАЗВОРАЧИВАНИЕ КОНТРАКТОВ ===");
        execSync('node deploy-all-simplified.js', { stdio: 'inherit' });
        
        console.log("\n🔍 === ПРОВЕРКА РАЗВЕРТЫВАНИЯ ===");
        execSync('node check-deployment.js', { stdio: 'inherit' });
        
        console.log("\n🧪 === ЗАПУСК ТЕСТОВ ===");
        execSync('node test-final-system-fixed.js', { stdio: 'inherit' });
        
        console.log("\n🎉 === СИСТЕМА ЗАПУЩЕНА УСПЕШНО! ===");
        console.log("✅ Hardhat node работает в отдельном терминале");
        console.log("✅ Все контракты развернуты");
        console.log("✅ Тесты прошли успешно");
        console.log("✅ Ошибки balanceOf исправлены");
        
    } catch (error) {
        console.error("❌ Ошибка:", error.message);
        process.exit(1);
    }
}

runSystem(); 