var React                   = require('react');
var bs                      = require('react-bootstrap');
var utils                   = require('../lib/utils');
var CodeMirror              = require('react-code-mirror');
var ConfirmAction   = require('../lib/ui/confirmaction');
var _                       = require('lodash');
var taskcluster     = require('taskcluster-client');

require('codemirror/mode/javascript/javascript');


/** BEGIN SUPER HACK */
var request = new XMLHttpRequest();
console.log('ignore this deprecation... once the API is in the upstream client we wont need '+
            'to do this anymore');
request.open('GET', 'https://taskcluster-aws-provisioner2.herokuapp.com/v1/api-reference', false);
//request.open('GET', 'http://localhost:5557/v1/api-reference', false);
request.send(null);
if (request.status === 200) {
  var reftxt = request.responseText;
  try {
    var reference = JSON.parse(reftxt);
  } catch(e) {
    console.log(e, e.stack);
    alert('Uh-oh, error: ' + e);
  }
} else {
  alert('Uh-oh, failed to load API reference');
}
if (reference.baseUrl[4] !== 's') {
  reference.baseUrl = 'https://' + reference.baseUrl.slice(7);
}
var AwsProvisionerClient = taskcluster.createClient(reference);
/** END SUPER HACK */

var defaultWorkerType = {
  "workerType": "boilerplate",
  "launchSpecification": {
  },
  "minCapacity": 0,
  "maxCapacity": 1,
  "scalingRatio": 0,
  "minPrice": 0,
  "maxPrice": 0.1,
  "canUseOndemand": false,
  "canUseSpot": true,
  "instanceTypes": [
    {
      "instanceType": "c3.small",
      "capacity": 1,
      "utility": 1,
      "overwrites": {
        "UserData": "e30="      
      }
    }
  ],
  "regions": [
    {
      "region": "us-west-2",
      "overwrites": {
        "ImageId": "ami-abcdefg"
      }
    }
  ]
};

var WorkerTypeEdit = React.createClass({
  mixins: [
    utils.createTaskClusterMixin({
      clients: {
        awsProvisioner: AwsProvisionerClient,
      },
    }),
  ],
  getInitialState: function() {
    return {
      workerType: JSON.stringify(this.props.value || defaultWorkerType, null, 2),
      invalidWorkerType: false,
    };
  },
  getDefaultProps: function() {
    return {
      value: undefined,
    }
  },
  handleChange: function(e) {
    var invalid = false;
    try {
      JSON.parse(e.target.value);
    } catch(err) {
      invalid = true;
    }
    this.setState({
      workerType: e.target.value,
      invalidWorkerType: invalid,
    });
  },
  saveWorkerType: function() {
    try {
      var worker = JSON.parse(this.state.workerType);
      var wName = worker.workerType;
      // Remember that we specify the name of the workerType
      // to create or update as part of the URL path.  We
      // ensure that it isn't in the create/update definition
      // to make sure that the path element and the json
      // property agree in every case
      delete worker.workerType;
      if (this.props.value) {
        return this.awsProvisioner.updateWorkerType(wName, worker).then(function() {
          return this.props.reload();
        });
      } else {
        return this.awsProvisioner.createWorkerType(wName, worker).then(function() {
          return this.props.reload();
        });
      }
    } catch (err) {
      return Promise.reject('Worker Type is not valid JSON');
    }
  },
  render: function() {
    return (<span>
    <CodeMirror
      ref="editor"
      lineNumbers={true}
      mode="application/json"
      textAreaClassName={'form-control'}
      textAreaStyle={{minHeight: '20em'}}
      value={this.state.workerType}
      onChange={this.handleChange}
      indentWithTabs={true}
      tabSize={2}
      theme="ambiance"/>
    <br/>
    <ConfirmAction
      buttonSize='xsmall'
      buttonStyle='default'
      glyph='save'
      label={this.props.value ? 'Update' : 'Create'}
      disabled={this.state.invalidWorkerType}
      action={this.saveWorkerType}
      success='Saved Worker Type'>
      Are you sure that you would like to {this.props.value ? 'update' : 'create'}
      this workerType? If there is a minimum number of instances, they will be
      provisioned
    </ConfirmAction>
    </span>);
  },
});

module.exports = WorkerTypeEdit;