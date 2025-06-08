let currentBuzzerStatus = 'off';

exports.getBuzzerCommand = (req, res) => {
  res.json({ status: currentBuzzerStatus });
};

exports.toggleBuzzer = (req, res) => {
  currentBuzzerStatus = currentBuzzerStatus === 'off' ? 'on' : 'off';
  res.json({ message: `Buzzer toggled to "${currentBuzzerStatus}"`, status: currentBuzzerStatus });
};