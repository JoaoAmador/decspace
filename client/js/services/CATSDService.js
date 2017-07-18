app.service('CATSDService', function($http, $q) {
  //input data
  var criteria, interaction_effects, actions, categories;

  //criteria pairs of mutual interaction effects
  var mutualSet = [], antagonisticSet = [];

  //assigned actions and corresponding categories
  var assignedActions = {};

  //similarity array
  var similarityValues = [];

  this.getResults = function(crt, inter_eff, acts, cats) {
    var deferred = $q.defer();

    //initialize data variables
    criteria = angular.copy(crt);
    interaction_effects = angular.copy(inter_eff);
    actions = angular.copy(acts);
    categories = angular.copy(cats);

    //reset the set variables
    mutualSet = [];
    antagonisticSet = [];
    assignedActions = {};
    similarityValues = [];

    for(category in categories)
      assignedActions[categories[category]['name']] = [];

    assignedActions['Not Assigned'] = [];

    //transform the functions' conditions to string
    conditionsToString();

    //invert the values of criteria to minimize
    minimizeCriteria();

    //calculate the sets of the interaction effects
    interactionEffectsSets();

    if(!nonNegativityCondition())
      deferred.resolve(false);

    var result = applyCriterionFunction().then(function(resolve) {
      similarityValues = resolve;

      assignActions();

      deferred.resolve(assignedActions);
    });

    return deferred.promise;
  }

  function conditionsToString() {
    for(criterion in criteria)
      for(branch in criteria[criterion].branches)
        if(!isNaN(criteria[criterion].branches[branch].function))
          criteria[criterion].branches[branch].function = criteria[criterion].branches[branch].function.toString();
  }

  function minimizeCriteria() {
    for(criterion in criteria) {
      if(criteria[criterion]['direction'] == 'Minimize') {
        for(action in actions)
          actions[action][criteria[criterion]['name']] = - actions[action][criteria[criterion]['name']];

        for(category in categories) {
          for(reference_action in categories[category]['reference_actions']) {
            categories[category]['reference_actions'][reference_action][criteria[criterion]['name']] = - categories[category]['reference_actions'][reference_action][criteria[criterion]['name']];
          }
        }
      }
    }
  }

  //set M (mutual effect) and set O (antagonistic)
  function interactionEffectsSets() {
    for(effect in interaction_effects) {
      if(interaction_effects[effect]['type'] == 'Mutual-Strengthening Effect' || interaction_effects[effect]['type'] == 'Mutual-Weakening Effect') {
        mutualSet.push(interaction_effects[effect]);
      }
      else {
        antagonisticSet.push(interaction_effects[effect]);
      }
    }
  }

  //guarantee that the weights of the criteria never become negative after considering the interaction effects
  function nonNegativityCondition() {
    for(criterion in criteria) {
      for(category in categories) {
        var name = criteria[criterion]['name'];

        var kij = categories[category][name];

        var kjl = 0;
        for(pair in mutualSet) {
          if(categories[category].name == mutualSet[pair].category) {
            if(mutualSet[pair]['criterion1'] == name || mutualSet[pair]['criterion2'] == name) {
              if(mutualSet[pair]['value'] < 0)
                kjl += Math.abs(mutualSet[pair]['value']);
            }
          }
        }

        var kjp = 0;
        for(pair2 in antagonisticSet) {
          if(categories[category].name == antagonisticSet[pair2].category) {
            if(antagonisticSet[pair2]['criterion1'] == name) {
              kjp += Math.abs(antagonisticSet[pair2]['value']);
            }
          }
        }

        if((kij - kjl - kjp) < 0)
          return false;
      }
    }
    return true;
  }

  function applyCriterionFunction() {
    var deferred = $q.defer();

    var post_obj = {};
    post_obj.criteria = criteria;
    post_obj.actions = actions;
    post_obj.categories = categories;
    post_obj.antagonisticSet = [antagonisticSet];

    $http.post('/expr-eval', post_obj).then(function(res) {
      deferred.resolve(res.data);
    });

    return deferred.promise;
  }

  //when fj(gj(a)) is non-negative, similarity coefficient is sj(a,b)
  function sj(criterion, action, reference_action) {
    var result;

    for(item in similarityValues) {
      if(similarityValues[item]['criterion'] == criterion && similarityValues[item]['action'] == action && similarityValues[item]['reference_action'] == reference_action) {
        result = similarityValues[item]['result'];
        break;
      }
    }

    if(result < 0)
      result = 0;

    return result;
  }

  //when fj(gj(a)) is non-negative, similarity coefficient is dj(a,b)
  function dj(criterion, action, reference_action) {
    var result;

    for(item in similarityValues) {
      if(similarityValues[item]['criterion'] == criterion && similarityValues[item]['action'] == action && similarityValues[item]['reference_action'] == reference_action) {
        result = similarityValues[item]['result'];
        break;
      }
    }

    if(result > 0)
      result = 0;

    return result;
  }

  //z : [0,1]*[0,1]->[0,1] is a real-valued function
  function z(x, y) {
    return x * y;
  }

  function k(action, reference_action, category) {
    var result = 0;

    var kj = 0;
    for(criterion in criteria) {
      kj += category[criteria[criterion]['name']];
    }

    var kij = 0;
    for(pair in mutualSet) {
      if(category.name == mutualSet[pair].category) {
        var f_value1, f_value2;

        for(item in similarityValues) {
          if(similarityValues[item]['criterion'] == mutualSet[pair]['criterion1'] && similarityValues[item]['action'] == action['name'] && similarityValues[item]['reference_action'] == reference_action['name']) {
            f_value1 = similarityValues[item]['result'];
          }
          else if(similarityValues[item]['criterion'] == mutualSet[pair]['criterion2'] && similarityValues[item]['action'] == action['name'] && similarityValues[item]['reference_action'] == reference_action['name']){
            f_value2 = similarityValues[item]['result'];
          }
        }

        if(f_value1 > 0  && f_value2 > 0) {
          var s1 = sj(mutualSet[pair]['criterion1'], action['name'], reference_action['name']);
          var s2 = sj(mutualSet[pair]['criterion2'], action['name'], reference_action['name']);

          kij += z(s1, s2) * mutualSet[pair]['value'];
        }
      }
    }

    var kih = 0;
    for(pair2 in antagonisticSet) {
      if(category.name == antagonisticSet[pair2].category) {
        var f_value3, f_value4;

        for(item in similarityValues) {
          if(similarityValues[item]['criterion'] == antagonisticSet[pair2]['criterion1'] && similarityValues[item]['action'] == action['name'] && similarityValues[item]['reference_action'] == reference_action['name']) {
            f_value3 = similarityValues[item]['result'];
          }
          else if(similarityValues[item]['criterion'] == antagonisticSet[pair2]['criterion2'] && similarityValues[item]['action'] == action['name'] && similarityValues[item]['reference_action'] == reference_action['name']){
            f_value4 = similarityValues[item]['result'];
          }
        }

        if(f_value3 > 0 && f_value4 < 0) {
          var s3 = sj(antagonisticSet[pair2]['criterion1'], action['name'], reference_action['name']);
          var s4 = dj(antagonisticSet[pair2]['criterion2'], action['name'], reference_action['name']);

          kih += z(s3, s4) * antagonisticSet[pair2]['value'];
        }
      }
    }

    return kj + kij - kih;
  }

  //a non-additive similarity function
  function s(action, reference_action, category) {

    var result = 0;

    for(criterion in criteria)
      result += category[criteria[criterion]['name']] * sj(criteria[criterion]['name'], action['name'], reference_action['name']);

    for(pair in mutualSet) {
      if(category.name == mutualSet[pair].category) {
        var f_value1, f_value2;

        for(item in similarityValues) {
          if(similarityValues[item]['criterion'] == mutualSet[pair]['criterion1'] && similarityValues[item]['action'] == action['name'] && similarityValues[item]['reference_action'] == reference_action['name'])
            f_value1 = similarityValues[item]['result'];
          else if(similarityValues[item]['criterion'] == mutualSet[pair]['criterion2'] && similarityValues[item]['action'] == action['name'] && similarityValues[item]['reference_action'] == reference_action['name'])
            f_value2 = similarityValues[item]['result'];
        }

        if(f_value1 > 0  && f_value2 > 0) {
          var s1 = sj(mutualSet[pair]['criterion1'], action['name'], reference_action['name']);
          var s2 = sj(mutualSet[pair]['criterion2'], action['name'], reference_action['name']);

          result += z(s1, s2) * mutualSet[pair]['value'];
        }
      }
    }

    for(pair2 in antagonisticSet) {
      if(category.name == antagonisticSet[pair2].category) {
        var f_value3, f_value4;

        for(item in similarityValues) {
          if(similarityValues[item]['criterion'] == antagonisticSet[pair2]['criterion1'] && similarityValues[item]['action'] == action['name'] && similarityValues[item]['reference_action'] == reference_action['name'])
            f_value3 = similarityValues[item]['result'];
          else if(similarityValues[item]['criterion'] == antagonisticSet[pair2]['criterion2'] && similarityValues[item]['action'] == action['name'] && similarityValues[item]['reference_action'] == reference_action['name'])
            f_value4 = similarityValues[item]['result'];
        }

        if(f_value3 > 0 && f_value4 < 0) {
          var s3 = sj(antagonisticSet[pair2]['criterion1'], action['name'], reference_action['name']);
          var s4 = dj(antagonisticSet[pair2]['criterion2'], action['name'], reference_action['name']);

          result -= z(s3, s4) * antagonisticSet[pair2]['value'];
        }
      }
    }

    var res2 = result/k(action, reference_action, category);

    return res2;
  }

  //a non-linear dissimilarity function
  function dPlus(action, reference_action) {
    var result = 1;
    for(criterion in criteria) {
      if(action[criteria[criterion]['name']] > reference_action[criteria[criterion]['name']]) {
        result *= (1 + dj(criteria[criterion]['name'], action['name'], reference_action['name']));
      }
    }

    return result - 1;
  }

  function dMinus(action, reference_action) {
    var result = 1;
    for(criterion in criteria) {
      if(reference_action[criteria[criterion]['name']] > action[criteria[criterion]['name']]) {
        result *= (1 + dj(criteria[criterion]['name'], action['name'], reference_action['name']));
      }
    }

    return result - 1;
  }

  //a multiplicative comprehensive similarity function
  function delta(action, reference_action, category) {
    return s(action, reference_action, category) * (1 + dPlus(action, reference_action)) * (1 + dMinus(action, reference_action));
  }

  function deltaMax(action, category) {
    var result = 0;

    for(reference_action in category['reference_actions']) {
      var res = delta(action, category['reference_actions'][reference_action], category);

      if(res > result) {
        result = res;
      }
    }
    return result;
  }

  //similarity assignment procedure
  function assignActions() {
    for(action in actions) {
      //set K - categories to assign action to
      var k_set = [];
      //compare action with set B of category
      for(category in categories) {
        var result = deltaMax(actions[action], categories[category]);

        if(result >= categories[category]['membership_degree'])
          k_set.push(categories[category]['name']);
      }

      if(k_set.length == 0) {
        assignedActions['Not Assigned'].push(actions[action]['name']);
      }
      else {
        for(cat in k_set) {
          assignedActions[k_set[cat]].push(actions[action]['name']);
        }
      }
    }
  }
});
