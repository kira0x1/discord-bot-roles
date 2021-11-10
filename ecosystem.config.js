module.exports = {
   apps: [
      {
         name: 'mikaela-roles',
         script: './out/app.js',
         args: ['--color'],
         shutdown_with_message: true,
         kill_timeout: 15000,
         error_file: './logs/err.log',
         out_file: './logs/out.log',
         log_file: './logs/combined.log',
         time: true,
         env: {
            NODE_ENV: 'development'
         },
         env_production: {
            NODE_ENV: 'production',
            args: ['--production', '--color']
         }
      }
   ]
};
