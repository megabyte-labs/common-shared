import chalk from 'chalk'
import inquirer from 'inquirer'
import { execSync } from 'node:child_process'
import { decorateSystem } from '../lib/decorate-system.js'
import { logInstructions, LOG_DECORATOR_REGEX } from '../lib/log.js'

const MENU_ENTRY_TITLE_WIDTH = 24

/**
 * Prompts the user for the type of Molecule test they wish to perform
 *
 * @returns {string} The type of test, lowercased
 */
async function promptForTestType() {
  const descriptionMap = ['VirtualBox (Headless)', 'VirtualBox (Desktop)', 'Docker', 'Local', 'SSH']
  const choices = execSync(`yq eval -o=j '.description' molecule/*/molecule.yml`).toString()
    .split('\n').filter(value => value !== 'null' && value !== '').map(
      // eslint-disable-next-line security/detect-object-injection
      (description, index) => descriptionMap[index].padEnd(MENU_ENTRY_TITLE_WIDTH) + chalk.gray(description.slice(1,-1))
  )
  const choicesDecorated = choices.map((choice) => decorateSystem(choice))
  const response = await inquirer.prompt([
    {
      choices: choicesDecorated,
      message: 'What type of test would you like to perform?',
      name: 'testType',
      type: 'list'
    }
  ])

  const DECORATION_LENGTH = 2

  return response.testType.replace(LOG_DECORATOR_REGEX, '').toLowerCase().slice(DECORATION_LENGTH)
}

/**
 * Main script logic
 */
async function run() {
  logInstructions(
    'Molecule Test',
    'There are currently five different options for running Molecule tests.\n\n' +
      chalk.bold('1. VirtualBox-Headless:') +
      '\nRuns tests using VirtualBox headless VMs.' +
      ' It is the test type used to generate the compatibility chart.\n' +
      chalk.bold('2. VirtualBox-Desktop:') +
      '\nRuns tests using a VirtualBox desktop version VM. Use this type of test' +
      ' to run the Ansible play and then open the VirtualBox VM to smoke test the software.\n' +
      chalk.bold('3. Docker:') +
      '\nUtilizes Docker to test the Ansible play. It has some limitations such' +
      ' as not being able to test snap installations on all operating systems. It also can only run tests' +
      ' on Linux environments. This is, however, the fastest way to test roles and requires the least amount' +
      ' of RAM.\n' +
      chalk.bold('4. Local:') +
      '\nRuns the Ansible play on the local machine. Use this to run the Ansible play on your local' +
      ' machine. You might use this if you want to inspect the software after running the play.\n' +
      chalk.bold('5. SSH:') +
      '\nRuns the Ansible play on a remote machine after connecting via SSH. This requires that you' +
      ' already have the SSH credentials configured (i.e. ~/.ssh is setup).'
  )
  const testType = await promptForTestType()
  if (testType.includes('local')) {
    execSync(`task ansible:test:local`, { stdio: 'inherit' })
  } else if (testType.includes('(headless)')) {
    execSync(`task ansible:test:molecule:virtualbox:prompt`, { stdio: 'inherit' })
  } else if (testType.includes('docker')) {
    execSync(`task ansible:test:molecule:docker:prompt`, { stdio: 'inherit' })
  } else if (testType.includes('(desktop)')) {
    execSync(`task ansible:test:molecule:virtualbox:converge:prompt`, { stdio: 'inherit' })
  } else if (testType.includes('ssh')) {
    execSync(`task ansible:test:molecule:ssh:prompt`, { stdio: 'inherit' })
  }
}

run()
