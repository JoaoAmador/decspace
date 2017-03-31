app.service('SRFService', function() {
  //input data
  var criteria, white_cards, ranking, ratio_z, decimal_places, weight_type;

  //0 = least important, ranking - 1 = most important
  var ranking_order = [];

  //ranking_order without white cards and other values calculated
  var order_criteria = [];

  //sum of all e'r values
  var e = 0;

  //
  var u = 0;

  //K - sum of all non-normalized weights
  var sum_k = 0;

  //K2 - sum of all ki'' (ki2)
  var sum_k2 = 0;

  var v;

  var listL1 = [];

  var listL2 = [];

  var m = [];

  var fPlus = [], fMinus = [];

  this.getResults = function(crtr, wht_crds, rnkng, rt_z, dcml_plcs, wght_tp) {
    //initialize input data variables
    criteria = angular.copy(crtr);
    white_cards = angular.copy(wht_crds);
    ranking = angular.copy(rnkng);
    ratio_z = angular.copy(rt_z);
    decimal_places = angular.copy(dcml_plcs);
    weight_type = angular.copy(wght_tp);

    buildRanking();

    calculateER();

    calculateE();

    calculateU();

    calculateNonNormalizedWeight();

    calculateSumK();

    calculateKI1();

    calculateK2();

    calculateSumK2();

    calculateV();

    calculateRatioDI1();

    calculateRatioDI2();

    buildListL1();

    buildListL2();

    buildListM();

    buildListsF();

    roundNormalizedWeights();

    formatResults();

    return criteria;
  }

  function buildRanking() {
    for(i = 0; i < ranking; i++) {
      //new position of ranking order
      var new_pos = {};
      //cards in the current position
      var pos_cards = [];

      for(criterion in criteria)
        if(criteria[criterion]['position'] == ranking - i - 1)
          pos_cards.push(criteria[criterion]['name']);

      for(white_card in white_cards)
        if(white_cards[white_card]['position'] == ranking - i - 1)
          pos_cards.push('white_card');

      new_pos['position'] = i;
      new_pos['cards'] = pos_cards;
      ranking_order.push(new_pos);
    }
  }

  function calculateER() {
    for(rank in ranking_order) {
      //number of white cards between rank r and r + 1
      var e_r = 0;

      //do not calculate e'r for the most important criteria
      if(!ranking_order[rank]['cards'].includes('white_card')) {
        if(Number(rank) < ranking_order.length - 1) {
          //copy of the rank variable, so that it doesn't change
          var rank_aux = angular.copy(Number(rank));
          //increment e_r if there are any white cards in the between the ranks r and r+1
          while(ranking_order[Number(rank_aux) + 1]['cards'].includes('white_card')) {
            e_r++;
            rank_aux++;
          }

          //add the er value to the rank object
          ranking_order[rank]['er'] = e_r + 1;
        }
        else
          ranking_order[rank]['er'] = 0;

        //add the object to the order_criteria array
        order_criteria.push(ranking_order[rank]);
      }
    }
  }

  function calculateE() {
    for(criterion in order_criteria) {
      e += order_criteria[criterion]['er'];
    }
  }

  function calculateU() {
    //6 decimal places
    u = Math.round(((ratio_z - 1) / e) * 1000000) / 1000000;
  }

  function calculateNonNormalizedWeight() {
    for(criterion in order_criteria) {

      //sum of e'r before rank r
      var sum_er = 0;

      for(rank = 0; rank < Number(criterion); rank++)
        sum_er += order_criteria[rank]['er'];

      order_criteria[criterion]['non-normalized weight'] = Math.round((1 + u * sum_er) * 100) / 100;
    }
  }

  function calculateSumK() {
    for(rank in order_criteria)
      sum_k += order_criteria[rank]['non-normalized weight'] * order_criteria[rank]['cards'].length;
  }

  //KI1 = ki*
  function calculateKI1() {
    for(rank in order_criteria)
      order_criteria[rank]['ki1'] = (100 / sum_k) * order_criteria[rank]['non-normalized weight'];
  }

  //K2 = ki''
  function calculateK2() {
    for(rank in order_criteria)
      order_criteria[rank]['ki2'] = Math.floor(order_criteria[rank]['ki1'] * Math.pow(10, Number(decimal_places))) / Math.pow(10, Number(decimal_places));
  }

  function calculateSumK2() {
    for(rank in order_criteria)
      sum_k2 += order_criteria[rank]['ki2'] * order_criteria[rank]['cards'].length;
  }

  function calculateV() {
    var var_e = 100 - sum_k2;

    v = Math.round(Math.pow(10, decimal_places) * var_e);
  }

  function calculateRatioDI1() {
    for(rank in order_criteria)
      order_criteria[rank]['di1'] = (Math.pow(10, -Number(decimal_places)) - (order_criteria[rank]['ki1'] - order_criteria[rank]['ki2'])) / order_criteria[rank]['ki1'];
  }

  function calculateRatioDI2() {
    for(rank in order_criteria)
      order_criteria[rank]['di2'] = (order_criteria[rank]['ki1'] - order_criteria[rank]['ki2']) / order_criteria[rank]['ki1'];
  }

  function compareDI1(a, b) {
    if(a['di1'] < b['di1'])
      return -1;
    else if(a['di1'] > b['di1'])
      return 1;
    else {
      if(a['index'] < b['index'])
        return 1;
      else if(a['index'] > b['index'])
        return -1;
      else
        return 0;
    }
  }

  function buildListL1() {
    for(criterion in criteria) {
      var new_pair = {};

      new_pair['index'] = Number(criterion) + 1;

      for(rank in order_criteria) {
        if(order_criteria[rank]['cards'].includes(criteria[criterion]['name'])) {
          new_pair['di1'] = order_criteria[rank]['di1'];
          break;
        }
      }

      listL1.push(new_pair);
    }

    listL1.sort(compareDI1);
  }

  function compareDI2(a, b) {
    if(a['di2'] < b['di2'])
      return 1;
    else if(a['di2'] > b['di2'])
      return -1;
    else {
      if(a['index'] < b['index'])
        return 1;
      else if(a['index'] > b['index'])
        return -1;
      else
        return 0;
    }
  }

  function buildListL2() {
    for(criterion in criteria) {
      var new_pair = {};

      new_pair['index'] = Number(criterion) + 1;

      for(rank in order_criteria) {
        if(order_criteria[rank]['cards'].includes(criteria[criterion]['name'])) {
          new_pair['di2'] = order_criteria[rank]['di2'];
          break;
        }
      }

      listL2.push(new_pair);
    }

    listL2.sort(compareDI2);
  }

  function buildListM() {
    for(criterion in criteria) {
      var index = Number(criterion) + 1;
      var di1, di2;

      for(item1 in listL1) {
        if(listL1[item1]['index'] == index) {
          di1 = listL1[item1]['di1'];
          break;
        }
      }

      for(item2 in listL2) {
        if(listL2[item2]['index'] == index) {
          di2 = listL2[item2]['di2'];
          break;
        }
      }

      if(di1 > di2)
        m.push(index);
    }
  }

  function buildListsF() {
    if(m.length + v <= criteria.length) {
      //list F-
      //the m criteria of M
      for(criterion in m)
        fMinus.push(m[criterion]);

      //the n-v-m last criteria of listL2 not belonging to M
      var crt_count = criteria.length - v - m.length;

      for(i = listL2.length - 1; i >= 0; i--) {
        if(!m.includes(listL2[i]['index']) && crt_count > 0) {
          fMinus.push(listL2[i]['index']);
          crt_count--;
        }
      }

      //list F+
      //the first v criteria of L not belonging to M
      crt_count = v;

      for(criterion in listL2) {
        if(!m.includes(listL2[criterion]['index']) && crt_count > 0) {
          fPlus.push(listL2[criterion]['index']);
          crt_count--;
        }
      }
    }
    else if(m.length + v > criteria.length) {
      //list F-
      //last n-v criteria of L not belonging to M
      var crt_count = criteria.length - v;

      for(i = listL1.length - 1; i >= 0; i--) {
        if(!m.includes(listL2[i]['index']) && crt_count > 0) {
          fMinus.push(listL2[i]['index']);
          crt_count--;
        }
      }

      //list F+
      for(criterion in criteria)
        if(!fMinus.includes(Number(criterion) + 1))
          fPlus.push(Number(criterion) + 1)
    }
  }

  function roundNormalizedWeights() {
    for(rank in order_criteria) {
      for(card in order_criteria[rank]['cards']) {
        var crt_index;

        for(criterion in criteria)
          if(criteria[criterion]['name'] == order_criteria[rank]['cards'][card])
            crt_index = Number(criterion) + 1;


        if(fPlus.includes(crt_index))
          order_criteria[rank]['normalized weight'] = order_criteria[rank]['ki2'] + Math.pow(10, -decimal_places);
        else
          order_criteria[rank]['normalized weight'] = order_criteria[rank]['ki2'];
        break;
      }
    }
  }


  function formatResults() {
    for(criterion in criteria) {
      for(rank in order_criteria) {
        if(order_criteria[rank]['cards'].includes(criteria[criterion]['name'])) {
          criteria[criterion]['non-normalized weight'] = order_criteria[rank]['non-normalized weight'];
          criteria[criterion]['normalized weight'] = order_criteria[rank]['normalized weight'];
        }
      }
    }
  }
});
