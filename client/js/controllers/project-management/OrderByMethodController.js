app.controller('OrderByMethodController', function($scope, $window, $http, OrderByService) {
  //get the id of the open project
  var url = window.location.href;
  var proj_id = Number(url.substr(url.indexOf('?id=') + 4));

  //keep the value of the selectedCriterion
  var selectedCriterion = '';

  $scope.new_execution;

  function requestLogIn() {
    $http.get('/requestlogin').success(function(res) {
      $scope.username = res.user;
    });
  }

  $scope.logOut = function() {
    $http.get('/logout').success(function(res) {
      $window.location.href = '../../index.html';
    });
  }

  //change "last update" field to current date and get the selected method
  function rewriteLastUpdate() {
    //get all projects from database
    $http.get('/projects').success(function(res) {
      //get current date
      var current_date = new Date();
      var last_update = current_date.getDate() + '/' + (current_date.getMonth() + 1) + '/' + current_date.getFullYear();

      //projects of the logged user
      var user_proj;

      for(user in res) {
        if(res[user].username == $scope.username) {
          user_proj = res[user];
          break;
        }
      }

      for(project in user_proj['projects']) {
        if(user_proj['projects'][project]['id'] == proj_id) {
          //rewrite "last_update"
          user_proj['projects'][project]['last_update'] = last_update;
          break;
        }
      }

      //get the id of the document and then remove it from the new one
      var id_doc = user_proj['_id'];
      delete user_proj['_id'];

      //delete the previous document with the list of projects
      $http.delete('/projects/' + id_doc).success(function(){
        //add the new list of projects
        $http.post('/projects', user_proj).success(function() {
          getCriteria();
          getSelectedCriterion();
          getActions();
          getExecutions();
        });
      });
    });
  }

  function getCriteria() {
    $http.get('/projects').success(function(res) {
      //projects of the logged user
      var user_proj;

      for(user in res) {
        if(res[user].username == $scope.username) {
          user_proj = res[user];
          break;
        }
      }

      for(project in user_proj['projects']) {
        if(user_proj['projects'][project]['id'] == proj_id) {
          //get the criteria previously added
          $scope.criteria = user_proj['projects'][project]['criteria'];
          break;
        }
      }
    });
  }

  //get the number of parameters of a scope variable
  function getNumberOfFields(scope_var) {
    var i = 0;

    for(field in scope_var)
      i++;

    return i;
  }

  $scope.addCriterion = function() {
    //don't allow any of the fields to be empty - name, type and direction
    if(getNumberOfFields($scope.new_criterion) < 3 || $scope.new_criterion.name == '' || $scope.new_criterion.type == '' || $scope.new_criterion.direction == '') {
      $scope.showCriterionFieldsError = true;
      $scope.showCriterionNameError = false;
    }
    //check if any there is another criterion with the same name - do not allow that
    else {
      $scope.showCriterionFieldsError = false;
      $scope.showCriterionNameError = false;

      for(criterion in $scope.criteria) {
        if($scope.new_criterion.name == $scope.criteria[criterion]['name']) {
          $scope.showCriterionNameError = true;
          break;
        }
      }

      if(!$scope.showCriterionNameError) {
        $http.get('/projects').success(function(res) {
          //projects of the logged user
          var user_proj;

          for(user in res) {
            if(res[user].username == $scope.username) {
              user_proj = res[user];
              break;
            }
          }

          for(project in user_proj['projects']) {
            if(user_proj['projects'][project]['id'] == proj_id) {
              //define id of the criteria
              if(user_proj['projects'][project]['criteria'].length == 0)
                var id = 1;
              else
                var id = user_proj['projects'][project]['criteria'][user_proj['projects'][project]['criteria'].length - 1]['id'] + 1;

              //insert criterion into database
              user_proj['projects'][project]['criteria'].push({'id':id,'name':$scope.new_criterion.name,'type':$scope.new_criterion.type,'direction':$scope.new_criterion.direction});
              break;
            }
          }

          //get the id of the document and then remove it from the new one
          var id_doc = user_proj['_id'];
          delete user_proj['_id'];

          //delete the previous document with the list of projects
          $http.delete('/projects/' + id_doc).success(function(){
            //add the new list of projects
            $http.post('/projects', user_proj).success(function() {
              //refresh the list of projects
              getCriteria();
              //reset the input fields
              $scope.new_criterion.name = '';
              $scope.new_criterion.type = '';
              $scope.new_criterion.direction = '';
            });
          });
        });
      }
    }
  }

  //edit a certain criterion
  $scope.editCriterion = function(criterion) {
    //hide the listed project and show the edit view
    angular.element(document.querySelector('#criterion-list-' + criterion.id)).addClass('no-display');
    angular.element(document.querySelector('#criterion-edit-' + criterion.id)).removeClass('no-display');

    //disable all other open, edit, duplicate or delete buttons
    angular.element(document.querySelectorAll('.btn-edit, .btn-remove')).prop('disabled', true);
  }

  //confirm edit changes
  $scope.confirmEditCriterion = function(criterion) {
    //don't allow any of the fields to be empty - name, type and direction
    if(getNumberOfFields(criterion) < 3 || criterion.name == '' || criterion.type == '' || criterion.direction == '') {
      $scope.showCriterionFieldsError = true;
      $scope.showCriterionNameError = false;
    }
    //check if any there is another criterion with the same name - do not allow that
    else {
      $scope.showCriterionFieldsError = false;
      $scope.showCriterionNameError = false;

      for(crt in $scope.criteria) {
        if(criterion.name == $scope.criteria[crt]['name'] && criterion.id != $scope.criteria[crt]['id']) {
          $scope.showCriterionNameError = true;
          break;
        }
      }

      if(!$scope.showCriterionNameError) {
        //get all projects from the database
        $http.get('/projects').success(function(res) {
          var user_proj = '';

          //get the other previously stored projects by the logged user
          for(user in res) {
            if(res[user].username == $scope.username)
              user_proj = res[user];
          }

          //find project
          for(proj in user_proj['projects'])
            if(user_proj['projects'][proj]['id'] == project.id) {
              for(crt in user_proj['projects'][proj]['id']['criterion']) {
                if(user_proj['projects'][proj]['id']['criterion'][crt]['id'] == criterion.id) {
                  user_proj['projects'][proj]['id']['criterion'][crt]['name'] = criterion.name;
                  user_proj['projects'][proj]['id']['criterion'][crt]['type'] = criterion.type;
                  user_proj['projects'][proj]['id']['criterion'][crt]['direction'] = criterion.direction;
                }
              }
            }

          var id_doc = user_proj['_id'];
          delete user_proj['_id'];

          //delete the previous document with the list of projects
          $http.delete('/projects/' + id_doc).success(function(){
            //add the new list of projects
            $http.post('/projects', user_proj).success(function() {
              //refresh the list of projects and the initial view
              getCriteria();
            });
          });
        });
      }
    }
  }

  //cancel edit changes
  $scope.cancelEditCriterion = function(criterion) {
    getCriteria();
  }

  $scope.deleteCriterion = function(criterion) {
    $http.get('/projects').success(function(res) {
      //projects of the logged user
      var user_proj;

      for(user in res) {
        if(res[user].username == $scope.username) {
          user_proj = res[user];
          break;
        }
      }

      for(project in user_proj['projects']) {
        if(user_proj['projects'][project]['id'] == proj_id) {
          for(crt in user_proj['projects'][project]['criteria']) {
            if(user_proj['projects'][project]['criteria'][crt]['name'] == criterion.name) {
              //search for criterion and delete it from the database
              user_proj['projects'][project]['criteria'].splice(crt, 1);

              //if it is the selected criterion, then rewrite it
              if(selectedCriterion == criterion.name)
                user_proj['projects'][project]['order_by_criterion'] = '';

              break;
            }
          }
          break;
        }
      }

      //get the id of the document and then remove it from the new one
      var id_doc = user_proj['_id'];
      delete user_proj['_id'];

      //delete the previous document with the list of projects
      $http.delete('/projects/' + id_doc).success(function(){
        //add the new list of projects
        $http.post('/projects', user_proj).success(function() {
          //refresh the list of projects
          getCriteria();
        });
      });
    });
  }

  function getSelectedCriterion() {
    $http.get('/projects').success(function(res) {
      //projects of the logged user
      var user_proj;

      for(user in res) {
        if(res[user].username == $scope.username)
          user_proj = res[user];
      }

      for(project in user_proj['projects']) {
        if(user_proj['projects'][project]['id'] == proj_id) {
          //get the selected criterion
          selectedCriterion = user_proj['projects'][project]['order_by_criterion'];
        }
      }
    });
  }

  $scope.selectCriterion = function(criterion) {
    $http.get('/projects').success(function(res) {
      //projects of the logged user
      var user_proj;

      for(user in res) {
        if(res[user].username == $scope.username)
          user_proj = res[user];
      }

      for(project in user_proj['projects']) {
        if(user_proj['projects'][project]['id'] == proj_id) {
          //insert or "rewrite" selected criterion in db
          user_proj['projects'][project]['order_by_criterion'] = criterion.name;
        }
      }

      //get the id of the document and then remove it from the new one
      var id_doc = user_proj['_id'];
      delete user_proj['_id'];

      //delete the previous document with the list of projects
      $http.delete('/projects/' + id_doc).success(function(){
        //add the new list of projects
        $http.post('/projects', user_proj).success(function() {
          selectedCriterion = criterion.name;
        });
      });
    });
  }

  $scope.isCriterionSelected = function(criterion) {
    if(selectedCriterion == criterion.name)
      return true;
    else
      return false;
  }

  function getActions() {
    $http.get('/projects').success(function(res) {
      //projects of the logged user
      var user_proj;

      for(user in res) {
        if(res[user].username == $scope.username) {
          user_proj = res[user];
          break;
        }
      }

      for(project in user_proj['projects']) {
        if(user_proj['projects'][project]['id'] == proj_id) {
          //get the actions previously added
          $scope.actions = user_proj['projects'][project]['actions'];
          break;
        }
      }
    });
  }

  $scope.addAction = function() {
    //don't allow to insert an action with an empty field
    if(getNumberOfFields($scope.new_action) <= $scope.criteria.length) {
      $scope.showActionFieldsError = true;
      $scope.showActionNameError = false;
    }
    //don't actions with the same name
    else {
      $scope.showActionFieldsError = false;
      $scope.showActionNameError = false;

      for(action in $scope.actions) {
        if($scope.new_action.name == $scope.actions[action]['name']) {
          $scope.showActionNameError = true;
          break;
        }
      }

      if(!$scope.showActionNameError) {
        $http.get('/projects').success(function(res) {
          //projects of the logged user
          var user_proj;

          for(user in res) {
            if(res[user].username == $scope.username) {
              user_proj = res[user];
              break;
            }
          }

          for(project in user_proj['projects']) {
            if(user_proj['projects'][project]['id'] == proj_id) {
              //insert action into database
              user_proj['projects'][project]['actions'].push($scope.new_action);
              break;
            }
          }

          //get the id of the document and then remove it from the new one
          var id_doc = user_proj['_id'];
          delete user_proj['_id'];

          //delete the previous document with the list of projects
          $http.delete('/projects/' + id_doc).success(function(){
            //add the new list of projects
            $http.post('/projects', user_proj).success(function() {
              //refresh the list of actions
              getActions();
              //reset the input fields
              $scope.new_action = ''
            });
          });
        });
      }
    }
  }

  $scope.deleteAction = function(action) {
    $http.get('/projects').success(function(res) {
      //projects of the logged user
      var user_proj;

      for(user in res) {
        if(res[user].username == $scope.username) {
          user_proj = res[user];
          break;
        }
      }

      for(project in user_proj['projects']) {
        if(user_proj['projects'][project]['id'] == proj_id) {
          for(act in user_proj['projects'][project]['actions']) {
            if(user_proj['projects'][project]['actions'][act]['name'] == action.name) {
              //search for action and delete it from the database
              user_proj['projects'][project]['actions'].splice(act, 1);
              break;
            }
          }
          break;
        }
      }

      //get the id of the document and then remove it from the new one
      var id_doc = user_proj['_id'];
      delete user_proj['_id'];

      //delete the previous document with the list of projects
      $http.delete('/projects/' + id_doc).success(function(){
        //add the new list of projects
        $http.post('/projects', user_proj).success(function() {
          //refresh the list of projects
          getActions();
        });
      });
    });
  }

  function getExecutions() {
    $http.get('/projects').success(function(res) {
      //projects of the logged user
      var user_proj;

      for(user in res) {
        if(res[user].username == $scope.username) {
          user_proj = res[user];
          break;
        }
      }

      for(project in user_proj['projects']) {
        if(user_proj['projects'][project]['id'] == proj_id) {
          //get the actions previously added
          $scope.executions = user_proj['projects'][project]['executions'];
          break;
        }
      }
    });
  }

  $scope.getResults = function() {
    var results = OrderByService.getResults($scope.criteria, $scope.actions, selectedCriterion);

    $http.get('/projects').success(function(res) {
      //get current date
      var current_date = new Date();
      var execution_date = current_date.getDate() + '-' + (current_date.getMonth() + 1) + '-' + current_date.getFullYear() + ' ' + current_date.getHours() + ':' + current_date.getMinutes() + ':' + current_date.getSeconds();

      //projects of the logged user
      var user_proj;

      for(user in res) {
        if(res[user].username == $scope.username) {
          user_proj = res[user];
          break;
        }
      }

      for(project in user_proj['projects']) {
        if(user_proj['projects'][project]['id'] == proj_id) {
          //insert action into database
          user_proj['projects'][project]['executions'].push({'id':user_proj['projects'][project]['executions'].length,'criteria':$scope.criteria,'actions':$scope.actions,'order_by_criterion':selectedCriterion,'results':results,'comment':$scope.new_execution.comment,'execution_date':execution_date});
          break;
        }
      }

      //get the id of the document and then remove it from the new one
      var id_doc = user_proj['_id'];
      delete user_proj['_id'];

      //delete the previous document with the list of projects
      $http.delete('/projects/' + id_doc).success(function() {
        //add the new list of projects
        $http.post('/projects', user_proj).success(function() {
          getExecutions();
          //reset the input fields
          $scope.new_execution.comment = ''
        });
      });
    });
  }

  requestLogIn();
  rewriteLastUpdate();
});
